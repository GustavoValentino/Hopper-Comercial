import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";

const prisma = new PrismaClient();

export const getDashboardMetrics = async (
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

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const popularProducts = await prisma.product.findMany({
      where: { userId },
      take: 15,
      orderBy: { stockQuantity: "desc" },
    });

    res.json({ popularProducts });
  } catch (error: any) {
    res.status(500).json({
      message: "Erro ao recuperar métricas do dashboard.",
      details: error.message,
    });
  }
};
