import { Request, Response } from "express";
import { PrismaClient, ProductUnit } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import { calcularDiasRestantes } from "../lib/dateUtils.js";

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
      imageBase64,
    } = authReq.body;

    if (!expirationDate) {
      res.status(400).json({ message: "A data de validade é obrigatória." });
      return;
    }
    if (!section) {
      res.status(400).json({ message: "O setor da gôndola é obrigatório." });
      return;
    }

    const productId = crypto.randomUUID();
    let imageUrl: string | null = null;

    if (
      typeof imageBase64 === "string" &&
      imageBase64.startsWith("data:image")
    ) {
      const upload = await cloudinary.uploader.upload(imageBase64, {
        folder: "products",
        public_id: `product-${productId}`,
        overwrite: true,
        invalidate: true,
      });
      imageUrl = upload.secure_url;
    }

    const product = await prisma.product.create({
      data: {
        productId,
        sku: sku?.toString().trim(),
        name: name?.toString().trim(),
        stockQuantity: parseInt(stockQuantity, 10) || 0,
        category: category?.toString().trim(),
        weight: weight ? parseFloat(weight) : null,
        unit: unit ? (unit as ProductUnit) : undefined,
        note: note ? note.toString().trim() : null,
        expirationDate: new Date(expirationDate),
        section: section.toString().trim(),
        imageUrl,
        userId,
      },
    });

    const diasRestantes = calcularDiasRestantes(expirationDate);

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
      res.status(401).json({ message: "Acesso negado." });
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
      imageBase64,
      isImageRemoved,
    } = authReq.body;

    let imageUrl: string | undefined;
    let shouldClearImage = false;

    // 1. Lógica de remoção da imagem
    if (isImageRemoved === true) {
      const publicId = `products/product-${id}`;
      await cloudinary.uploader.destroy(publicId);
      shouldClearImage = true;
    }

    // 2. Lógica de upload de nova imagem
    if (
      typeof imageBase64 === "string" &&
      imageBase64.startsWith("data:image")
    ) {
      const upload = await cloudinary.uploader.upload(imageBase64, {
        folder: "products",
        public_id: `product-${id}`,
        overwrite: true,
        invalidate: true,
      });
      imageUrl = upload.secure_url;
    }

    // 3. Atualização no Prisma
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
        // Define como null se a imagem foi removida, ou mantém o novo URL se enviado
        imageUrl: shouldClearImage ? null : imageUrl || undefined,
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
        details: `Editou o produto ${updatedProduct.name}.`,
      },
    });

    res.json(updatedProduct);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Erro ao atualizar produto.", error: error.message });
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
      res.status(401).json({ message: "Acesso negado." });
      return;
    }

    // 1. Buscamos o produto ANTES de deletar para verificar se existe imagem
    const product = await prisma.product.findUnique({
      where: { productId: id, userId },
    });

    if (!product) {
      res.status(404).json({ message: "Produto não encontrado." });
      return;
    }

    // 2. Se houver URL de imagem, deletamos do Cloudinary
    if (product.imageUrl) {
      try {
        // O public_id no Cloudinary, pela sua lógica de criação,
        // é 'products/product-' seguido do ID
        const publicId = `products/product-${id}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.error("Erro ao deletar imagem do Cloudinary:", cloudinaryError);
        // Não bloqueamos a deleção do banco caso a imagem falhe
      }
    }

    // 3. Deletamos as notificações e o produto
    await prisma.notification.deleteMany({ where: { productId: id, userId } });
    await prisma.product.delete({
      where: { productId: id, userId },
    });

    await prisma.auditLogs.create({
      data: {
        userId,
        action: "Exclusão de Produto",
        details: `Excluiu o produto ${product.name} (SKU: ${product.sku}).`,
      },
    });

    res.json({ message: "Produto e imagem excluídos com sucesso." });
  } catch (error: any) {
    res.status(500).json({ message: "Erro ao excluir produto." });
  }
};
