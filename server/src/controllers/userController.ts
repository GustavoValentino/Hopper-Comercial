import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const LIMITE_CRITICO_DIAS = 15;

const dataLimiteCritica = () => {
  const data = new Date();
  data.setDate(data.getDate() + LIMITE_CRITICO_DIAS);
  return data;
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        language: true,
        Products: {
          select: {
            productId: true,
            lotes: {
              where: { expirationDate: { lte: dataLimiteCritica() } },
              select: { loteId: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const formattedUsers = users.map((user) => {
      // Conta quantos lotes críticos o usuário possui em seus produtos
      const criticalProductsCount = user.Products.reduce(
        (acc, prod) => acc + prod.lotes.length,
        0,
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        createdAt: user.createdAt,
        language: user.language,
        criticalProductsCount,
        isOnline: false,
      };
    });

    const totalCriticalSystem = formattedUsers.reduce(
      (acc, user) => acc + user.criticalProductsCount,
      0,
    );

    res.status(200).json({ users: formattedUsers, totalCriticalSystem });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Erro ao buscar usuários: ${error.message}` });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = authReq.params;
    const { role, adminPassword } = authReq.body;

    if (!adminPassword || adminPassword !== process.env.ADMIN_USER_PASSWORD) {
      res.status(401).json({ message: "Senha de administrador inválida." });
      return;
    }

    if (!["operador", "admin"].includes(role?.toLowerCase())) {
      res.status(400).json({ message: "Nível de acesso inválido." });
      return;
    }

    // ID do admin de verdade, vindo da sessão autenticada (protegerRota
    // já validou isso antes de chegar aqui) — não mais do fallback quebrado
    // que acabava registrando a VÍTIMA como autora da própria mudança.
    const adminId = authReq.userId!;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { role: role.toLowerCase() },
      });

      await tx.auditLogs.create({
        data: {
          userId: adminId,
          action: "UPDATE_ROLE",
          details: `Nível de acesso de "${user.name}" alterado para ${role.toUpperCase()}.`,
        },
      });

      return user;
    });

    res.status(200).json(updatedUser);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Erro ao atualizar acesso: ${error.message}` });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = authReq.params;
    const { adminPassword } = authReq.body;

    if (!adminPassword || adminPassword !== process.env.ADMIN_USER_PASSWORD) {
      res.status(401).json({ message: "Senha de administrador inválida." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ message: "Usuário não encontrado." });
      return;
    }

    // Mesma correção: ID do admin vindo da sessão, não do fallback quebrado.
    const adminId = authReq.userId!;

    await prisma.$transaction(async (tx) => {
      await tx.auditLogs.create({
        data: {
          userId: adminId,
          action: "DELETE_USER",
          details: `O operador "${user.name}" (${user.email}) foi removido permanentemente do sistema.`,
        },
      });

      await tx.user.delete({ where: { id } });
    });

    res
      .status(200)
      .json({ message: `Usuário ${user.name} removido com sucesso.` });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Erro ao excluir usuário: ${error.message}` });
  }
};

export const updateUserSettings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;

    // IMPORTANTE: o ID de quem está sendo editado vem da SESSÃO
    // autenticada, não do corpo da requisição. Antes, um "userId" no
    // body era aceito sem checagem nenhuma — qualquer requisição podia
    // editar nome, e-mail e avatar de QUALQUER outro usuário do sistema.
    const userId = authReq.userId;
    const { username, email, language, profileImageBase64 } = authReq.body;

    if (!userId) {
      res
        .status(401)
        .json({ success: false, error: "Usuário não autenticado." });
      return;
    }

    let uploadedImageUrl: string | undefined;

    if (profileImageBase64?.startsWith("data:image")) {
      const upload = await cloudinary.uploader.upload(profileImageBase64, {
        folder: "avatars",
        public_id: `avatar-${userId}`,
        overwrite: true,
        invalidate: true,
      });
      uploadedImageUrl = upload.secure_url;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: username,
        email,
        language,
        ...(uploadedImageUrl && { image: uploadedImageUrl }),
      },
      include: {
        Products: {
          select: {
            productId: true,
            lotes: {
              where: { expirationDate: { lte: dataLimiteCritica() } },
              select: { loteId: true },
            },
          },
        },
      },
    });

    const criticalProductsCount = updatedUser.Products.reduce(
      (acc, prod) => acc + prod.lotes.length,
      0,
    );

    res.status(200).json({
      success: true,
      message: "Configurações salvas com sucesso.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        image: updatedUser.image,
        language: updatedUser.language,
        createdAt: updatedUser.createdAt,
        criticalProductsCount,
        isOnline: true,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: `Erro ao salvar configurações: ${error.message}`,
    });
  }
};
