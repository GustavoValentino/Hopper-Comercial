import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getNotifications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: "O parâmetro userId é obrigatório." });
      return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const limiteCritico = new Date();
    limiteCritico.setHours(0, 0, 0, 0);
    limiteCritico.setDate(limiteCritico.getDate() + 5);

    const produtosCriticos = await prisma.product.findMany({
      where: {
        expirationDate: {
          gte: hoje,
          lte: limiteCritico,
        },
      },
    });

    for (const produto of produtosCriticos) {
      if (!produto.expirationDate) continue;

      const alertaExistente = await prisma.notification.findFirst({
        where: {
          userId: String(userId),
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

        await prisma.notification.create({
          data: {
            userId: String(userId),
            productId: produto.productId,
            type: "CRITICAL_EXPIRY",
            message: `[URGENTE] O lote do produto '${produto.name}' no setor de ${setor} ${mensagemDias} Verifique a gôndola.`,
          },
        });
      }
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: String(userId) },
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
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: "O campo userId é obrigatório." });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId: String(userId), isRead: false },
      data: { isRead: true },
    });

    res
      .status(200)
      .json({ message: "Todas as notificações foram marcadas como lidas." });
  } catch (error: any) {
    res
      .status(500)
      .json({
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
    const { id } = req.params;

    const notificacao = await prisma.notification.update({
      where: { id: String(id) },
      data: { isRead: true },
    });

    res.status(200).json(notificacao);
  } catch (error: any) {
    res
      .status(500)
      .json({
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
    const { id } = req.params;

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
