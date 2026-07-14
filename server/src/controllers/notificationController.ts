import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";

const prisma = new PrismaClient();

export const getNotifications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId;

    if (!userId) {
      res.status(401).json({ error: "Usuário não autenticado." });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!currentUser) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    const isAdmin = currentUser.role?.toLowerCase() === "admin";

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const limiteCritico = new Date();
    limiteCritico.setHours(0, 0, 0, 0);
    limiteCritico.setDate(limiteCritico.getDate() + 5);

    const produtosCriticos = await prisma.product.findMany({
      where: {
        ...(isAdmin ? {} : { userId }),
        expirationDate: {
          gte: hoje,
          lte: limiteCritico,
        },
      },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    for (const produto of produtosCriticos) {
      if (!produto.expirationDate) continue;

      const alertaExistente = await prisma.notification.findFirst({
        where: {
          userId,
          productId: produto.productId,
          type: "CRITICAL_EXPIRY",
          isRead: false,
        },
      });

      if (!alertaExistente) {
        const stringData = produto.expirationDate
          .toISOString()
          .substring(0, 10);
        const expDate = new Date(`${stringData}T00:00:00`);
        const diasRestantes = Math.ceil(
          (expDate.getTime() - hoje.getTime()) / 86400000,
        );

        let mensagemDias =
          diasRestantes === 0
            ? "vence HOJE!"
            : diasRestantes === 1
              ? "vence AMANHÃ!"
              : `vence em ${diasRestantes} dias!`;

        const setor =
          (produto as any).category || (produto as any).section || "Geral";

        const responsavel =
          isAdmin && produto.user?.name
            ? ` (Responsável: ${produto.user.name})`
            : "";

        await prisma.notification.create({
          data: {
            userId,
            productId: produto.productId,
            type: "CRITICAL_EXPIRY",
            message: `[URGENTE] O lote do produto '${produto.name}' no setor de ${setor} ${mensagemDias} Verifique a gôndola.${responsavel}`,
          },
        });
      }
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(notifications);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Erro ao buscar notificações.", details: error.message });
  }
};

export const markAllAsRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId;

    if (!userId) {
      res.status(401).json({ error: "Usuário não autenticado." });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res
      .status(200)
      .json({ message: "Todas as notificações foram marcadas como lidas." });
  } catch (error: any) {
    res.status(500).json({
      error: "Erro ao atualizar notificações.",
      details: error.message,
    });
  }
};

export const createNotification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { targetUserId, message, type } = req.body;

    if (!targetUserId || !message) {
      res
        .status(400)
        .json({ error: "Os campos targetUserId e message são obrigatórios." });
      return;
    }

    const novaNotificacao = await prisma.notification.create({
      data: {
        userId: String(targetUserId),
        message,
        type: type || "CUSTOM_ALERT",
        isRead: false,
      },
    });

    res.status(201).json(novaNotificacao);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Erro ao criar notificação.", details: error.message });
  }
};

export const markAsRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId;
    const { id } = req.params;

    const notificacao = await prisma.notification.findUnique({
      where: { id: String(id) },
    });

    if (!notificacao || notificacao.userId !== userId) {
      res.status(403).json({ error: "Acesso negado a esta notificação." });
      return;
    }

    const atualizada = await prisma.notification.update({
      where: { id: String(id) },
      data: { isRead: true },
    });

    res.status(200).json(atualizada);
  } catch (error: any) {
    res.status(500).json({
      error: "Erro ao marcar notificação como lida.",
      details: error.message,
    });
  }
};

export const deleteNotification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId;
    const { id } = req.params;

    const notificacao = await prisma.notification.findUnique({
      where: { id: String(id) },
    });

    if (!notificacao || notificacao.userId !== userId) {
      res.status(403).json({ error: "Acesso negado a esta notificação." });
      return;
    }

    await prisma.notification.delete({
      where: { id: String(id) },
    });

    res.status(200).json({ message: "Notificação excluída com sucesso." });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Erro ao excluir notificação.", details: error.message });
  }
};
