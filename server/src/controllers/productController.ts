import { Request, Response } from "express";
import { PrismaClient, ProductUnit } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";

const prisma = new PrismaClient();

const calcularDiasRestantes = (expirationDate: Date): number => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(expirationDate);
  venc.setHours(0, 0, 0, 0);
  return Math.ceil((venc.getTime() - hoje.getTime()) / 86400000);
};

const gerarMensagemAlerta = (
  nome: string,
  setor: string,
  dias: number,
): { message: string; type: "CRITICAL_EXPIRY" | "SYSTEM" } => {
  if (dias <= 5) {
    const message =
      dias < 0
        ? `[PRODUTO VENCIDO] O lote de '${nome}' no setor ${setor} já se encontra vencido!`
        : dias === 0
          ? `[URGENTE] O lote de '${nome}' no setor ${setor} vence HOJE!`
          : `[ALERTA] O lote de '${nome}' no setor ${setor} possui vencimento crítico em ${dias} dias!`;
    return { message, type: "CRITICAL_EXPIRY" };
  }
  return {
    message: `[AVISO PRÉVIO] O lote de '${nome}' no setor ${setor} vencerá em ${dias} dias. Planeje a exposição ou promoções.`,
    type: "SYSTEM",
  };
};

export const getProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = authReq;
    const search = authReq.query.search?.toString().trim();

    const products = await prisma.product.findMany({
      where: {
        userId,
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
              { section: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json(products);
  } catch (error: any) {
    res.status(500).json({ message: "Erro ao buscar produtos do inventário." });
  }
};

export const createProduct = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = authReq;

    if (!userId) {
      res
        .status(401)
        .json({ message: "Acesso negado. Usuário não identificado." });
      return;
    }

    const {
      sku,
      name,
      stockQuantity,
      category,
      weight,
      unit,
      expirationDate,
      section,
      note,
    } = authReq.body;

    if (!expirationDate) {
      res.status(400).json({ message: "A data de validade é obrigatória." });
      return;
    }
    if (!section) {
      res.status(400).json({ message: "O setor da gôndola é obrigatório." });
      return;
    }

    const product = await prisma.product.create({
      data: {
        sku: sku?.toString().trim(),
        name: name?.toString().trim(),
        stockQuantity: parseInt(stockQuantity, 10) || 0,
        category: category?.toString().trim(),
        weight: weight ? parseFloat(weight) : null,
        unit: unit ? (unit as ProductUnit) : undefined,
        note: note ? note.toString().trim() : null,
        expirationDate: new Date(expirationDate),
        section: section.toString().trim(),
        userId,
      },
    });

    const diasRestantes = calcularDiasRestantes(new Date(expirationDate));

    if (diasRestantes <= 15) {
      const { message, type } = gerarMensagemAlerta(
        name,
        section,
        diasRestantes,
      );
      await prisma.notification.create({
        data: { userId, productId: product.productId, type, message },
      });
    }

    await prisma.auditLogs.create({
      data: {
        userId,
        action: "Cadastro de Produto",
        details: `Cadastrou o produto ${name} (SKU: ${sku}) no setor ${section}.`,
      },
    });

    res.status(201).json(product);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Erro ao criar produto.", error: error.message });
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = authReq.params;
    const { userId } = authReq;

    if (!userId) {
      res
        .status(401)
        .json({ message: "Acesso negado. Usuário não identificado." });
      return;
    }

    const {
      sku,
      name,
      stockQuantity,
      category,
      weight,
      unit,
      expirationDate,
      section,
      note,
    } = authReq.body;

    const updatedProduct = await prisma.product.update({
      where: { productId: id, userId },
      data: {
        sku: sku !== undefined ? sku.toString().trim() : undefined,
        name: name !== undefined ? name.toString().trim() : undefined,
        stockQuantity:
          stockQuantity !== undefined ? parseInt(stockQuantity, 10) : undefined,
        category:
          category !== undefined ? category.toString().trim() : undefined,
        weight:
          weight !== undefined
            ? weight
              ? parseFloat(weight)
              : null
            : undefined,
        unit: unit !== undefined ? (unit as ProductUnit) : undefined,
        note:
          note !== undefined
            ? note
              ? note.toString().trim()
              : null
            : undefined,
        expirationDate:
          expirationDate !== undefined ? new Date(expirationDate) : undefined,
        section: section !== undefined ? section.toString().trim() : undefined,
      },
    });

    if (
      expirationDate !== undefined ||
      name !== undefined ||
      section !== undefined
    ) {
      const diasRestantes = calcularDiasRestantes(
        updatedProduct.expirationDate,
      );

      if (diasRestantes <= 15) {
        const { message, type } = gerarMensagemAlerta(
          updatedProduct.name,
          updatedProduct.section,
          diasRestantes,
        );

        const existente = await prisma.notification.findFirst({
          where: { productId: id, userId },
        });

        if (existente) {
          await prisma.notification.update({
            where: { id: existente.id },
            data: { message, type, isRead: false },
          });
        } else {
          await prisma.notification.create({
            data: { userId, productId: id, type, message },
          });
        }
      } else {
        await prisma.notification.deleteMany({
          where: { productId: id, userId },
        });
      }
    }

    await prisma.auditLogs.create({
      data: {
        userId,
        action: "Edição de Produto",
        details: `Editou o produto SKU: ${sku || updatedProduct.sku}.`,
      },
    });

    res.json(updatedProduct);
  } catch (error: any) {
    res.status(500).json({ message: "Erro ao atualizar produto." });
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = authReq.params;
    const { userId } = authReq;

    if (!userId) {
      res
        .status(401)
        .json({ message: "Acesso negado. Usuário não identificado." });
      return;
    }

    await prisma.notification.deleteMany({ where: { productId: id, userId } });

    const deletedProduct = await prisma.product.delete({
      where: { productId: id, userId },
    });

    await prisma.auditLogs.create({
      data: {
        userId,
        action: "Exclusão de Produto",
        details: `Excluiu o produto ${deletedProduct.name} (SKU: ${deletedProduct.sku}).`,
      },
    });

    res.json({ message: "Produto excluído com sucesso." });
  } catch (error: any) {
    res.status(500).json({ message: "Erro ao excluir produto." });
  }
};
