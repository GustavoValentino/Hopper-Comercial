import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

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
          where: { expirationDate: { lte: dataLimiteCritica() } },
          select: { productId: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      createdAt: user.createdAt,
      language: user.language,
      criticalProductsCount: user.Products.length,
      isOnline: false,
    }));

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
    const { id } = req.params;
    const { role, adminPassword } = req.body;

    if (!adminPassword || adminPassword !== process.env.ADMIN_USER_PASSWORD) {
      res.status(401).json({ message: "Senha de administrador inválida." });
      return;
    }

    if (!["operador", "admin"].includes(role?.toLowerCase())) {
      res.status(400).json({ message: "Nível de acesso inválido." });
      return;
    }

    const adminId = (req as any).user?.id || id;

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
    const { id } = req.params;
    const { adminPassword } = req.body;

    if (!adminPassword || adminPassword !== process.env.ADMIN_USER_PASSWORD) {
      res.status(401).json({ message: "Senha de administrador inválida." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ message: "Usuário não encontrado." });
      return;
    }

    const adminId = (req as any).user?.id || id;

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
    const { userId, username, email, language, profileImageBase64 } = req.body;

    if (!userId) {
      res
        .status(400)
        .json({ success: false, error: "O ID do usuário é obrigatório." });
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
          where: { expirationDate: { lte: dataLimiteCritica() } },
        },
      },
    });

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
        criticalProductsCount: updatedUser.Products.length,
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
