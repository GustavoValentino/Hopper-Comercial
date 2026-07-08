import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getAuditLogs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const logs = await prisma.auditLogs.findMany({
      orderBy: {
        timestamp: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json(logs);
  } catch (error: any) {
    res.status(500).json({
      error: "Erro ao buscar histórico de auditoria.",
      details: error.message,
    });
  }
};
