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

const processarAlertasLotes = async (
  userId: string,
  productId: string,
  nome: string,
  setor: string,
  lotes: { expirationDate: Date }[],
) => {
  // Remove notificações antigas do produto
  await prisma.notification.deleteMany({ where: { productId, userId } });

  // Cria nova notificação para o lote mais crítico
  const lotesCriticos = lotes
    .map((l) => ({ ...l, dias: calcularDiasRestantes(l.expirationDate) }))
    .filter((l) => l.dias <= 15)
    .sort((a, b) => a.dias - b.dias);

  if (lotesCriticos.length > 0) {
    const { message, type } = gerarMensagemAlerta(
      nome,
      setor,
      lotesCriticos[0].dias,
    );
    await prisma.notification.create({
      data: { userId, productId, type, message },
    });
  }
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
      include: {
        lotes: {
          orderBy: { expirationDate: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Serializa para o frontend — mantém compatibilidade com campos antigos
    const produtosSerialized = products.map((p) => {
      const lotesMaisUrgente = p.lotes[0];
      return {
        ...p,
        // Campos de compatibilidade (pega do lote mais urgente)
        expirationDate: lotesMaisUrgente?.expirationDate ?? null,
        stockQuantity: p.lotes.reduce((acc, l) => acc + l.stockQuantity, 0),
        lotNumber: lotesMaisUrgente?.lotNumber ?? null,
        lotes: p.lotes,
      };
    });

    res.json(produtosSerialized);
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
      category,
      weight,
      unit,
      section,
      note,
      lotes: lotesRaw,
    } = authReq.body;

    if (!section) {
      res.status(400).json({ message: "O setor da gôndola é obrigatório." });
      return;
    }

    if (!lotesRaw || !Array.isArray(lotesRaw) || lotesRaw.length === 0) {
      res
        .status(400)
        .json({
          message:
            "Informe ao menos um lote com data de validade e quantidade.",
        });
      return;
    }

    for (const lote of lotesRaw) {
      if (!lote.expirationDate) {
        res
          .status(400)
          .json({
            message: "Todos os lotes precisam ter uma data de validade.",
          });
        return;
      }
      if (!lote.stockQuantity || parseInt(lote.stockQuantity, 10) < 0) {
        res
          .status(400)
          .json({
            message: "Todos os lotes precisam ter uma quantidade válida.",
          });
        return;
      }
    }

    const product = await prisma.product.create({
      data: {
        sku: sku?.toString().trim(),
        name: name?.toString().trim(),
        category: category?.toString().trim(),
        weight: weight ? parseFloat(weight) : null,
        unit: unit ? (unit as ProductUnit) : undefined,
        note: note ? note.toString().trim() : null,
        section: section.toString().trim(),
        userId,
        lotes: {
          create: lotesRaw.map((l: any) => ({
            expirationDate: new Date(l.expirationDate),
            stockQuantity: parseInt(l.stockQuantity, 10),
            lotNumber: l.lotNumber ? l.lotNumber.toString().trim() : null,
          })),
        },
      },
      include: { lotes: true },
    });

    await processarAlertasLotes(
      userId,
      product.productId,
      name,
      section,
      product.lotes,
    );

    await prisma.auditLogs.create({
      data: {
        userId,
        action: "Cadastro de Produto",
        details: `Cadastrou o produto ${name} (SKU: ${sku}) com ${lotesRaw.length} lote(s) no setor ${section}.`,
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
      category,
      weight,
      unit,
      section,
      note,
      lotes: lotesRaw,
    } = authReq.body;

    const updatedProduct = await prisma.product.update({
      where: { productId: id, userId },
      data: {
        sku: sku !== undefined ? sku.toString().trim() : undefined,
        name: name !== undefined ? name.toString().trim() : undefined,
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
        section: section !== undefined ? section.toString().trim() : undefined,
      },
    });

    // Atualiza lotes se fornecidos
    if (lotesRaw && Array.isArray(lotesRaw)) {
      // Remove lotes antigos e recria
      await prisma.lote.deleteMany({ where: { productId: id } });

      if (lotesRaw.length > 0) {
        await prisma.lote.createMany({
          data: lotesRaw.map((l: any) => ({
            productId: id,
            expirationDate: new Date(l.expirationDate),
            stockQuantity: parseInt(l.stockQuantity, 10),
            lotNumber: l.lotNumber ? l.lotNumber.toString().trim() : null,
          })),
        });
      }

      const lotesAtualizados = await prisma.lote.findMany({
        where: { productId: id },
      });
      await processarAlertasLotes(
        userId,
        id,
        updatedProduct.name,
        updatedProduct.section,
        lotesAtualizados,
      );
    }

    await prisma.auditLogs.create({
      data: {
        userId,
        action: "Edição de Produto",
        details: `Editou o produto SKU: ${sku || updatedProduct.sku}.`,
      },
    });

    const produtoFinal = await prisma.product.findUnique({
      where: { productId: id },
      include: { lotes: { orderBy: { expirationDate: "asc" } } },
    });

    res.json(produtoFinal);
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
    await prisma.lote.deleteMany({ where: { productId: id } });

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
