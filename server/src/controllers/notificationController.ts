import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import webpush from "web-push";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import {
  getHojeNoFusoBrasil,
  normalizarDataUTC,
  calcularDiasRestantes,
} from "../lib/dateUtils.js";
import { enviarEmail, templateAlertaVencimento } from "../lib/mailer.js";

const prisma = new PrismaClient();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:hopper.comercial@gmail.com";

let pushHabilitado = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    pushHabilitado = true;
  } catch (err) {
    console.error(
      "[web-push] Chaves VAPID inválidas — notificações push desativadas.",
      err,
    );
  }
} else {
  console.warn(
    "[web-push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas — notificações push desativadas. Gere um par com `npx web-push generate-vapid-keys`.",
  );
}

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

    const hoje = getHojeNoFusoBrasil();

    const limiteCritico = new Date(hoje);
    limiteCritico.setUTCDate(limiteCritico.getUTCDate() + 5);

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
          select: { name: true, email: true },
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
        const expDate = normalizarDataUTC(produto.expirationDate);
        const diasRestantes = Math.round(
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

        const mensagemTexto = `[URGENTE] O lote do produto '${produto.name}' no setor de ${setor} ${mensagemDias} Verifique a gôndola.${responsavel}`;

        await prisma.notification.create({
          data: {
            userId,
            productId: produto.productId,
            type: "CRITICAL_EXPIRY",
            message: mensagemTexto,
          },
        });

        if (pushHabilitado) {
          try {
            const userSubscriptions = await prisma.pushSubscription.findMany({
              where: { userId },
            });

            console.log(
              `[push] ${userSubscriptions.length} dispositivo(s) inscrito(s) para o usuário ${userId}.`,
            );

            const pushPayload = JSON.stringify({
              title: "Alerta de Vencimento - Hopper",
              body: mensagemTexto,
              url: "/",
              tag: `produto-${produto.productId}`,
            });

            for (const sub of userSubscriptions) {
              const pushConfig = {
                endpoint: sub.endpoint,
                keys: sub.keys as { p256dh: string; auth: string },
              };

              webpush
                .sendNotification(pushConfig, pushPayload)
                .then(() =>
                  console.log(
                    `[push] Notificação enviada com sucesso para ${sub.endpoint.slice(0, 50)}...`,
                  ),
                )
                .catch(async (err: any) => {
                  if (err.statusCode === 410 || err.statusCode === 404) {
                    await prisma.pushSubscription
                      .delete({ where: { id: sub.id } })
                      .catch(() => {});
                  } else {
                    console.error("Erro ao enviar push notification:", err);
                  }
                });
            }
          } catch (pushError) {
            console.error("Erro ao processar envios de Push:", pushError);
          }
        }

        if (produto.user?.email) {
          console.log(
            `[mailer] Disparando alerta para ${produto.user.email} (produto: ${produto.name}).`,
          );
          enviarEmail({
            to: produto.user.email,
            subject: `[Hopper] ${produto.name} — ${mensagemDias}`,
            html: templateAlertaVencimento({
              nomeProduto: produto.name,
              setor,
              mensagemDias,
              responsavel: isAdmin ? produto.user?.name : null,
            }),
          });
        }
      }
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const productIds = [
      ...new Set(
        notifications
          .map((n) => n.productId)
          .filter((id): id is string => !!id),
      ),
    ];

    const produtosRelacionados = productIds.length
      ? await prisma.product.findMany({
          where: { productId: { in: productIds } },
          select: {
            productId: true,
            name: true,
            imageUrl: true,
            section: true,
            expirationDate: true,
          },
        })
      : [];

    const produtosPorId = new Map(
      produtosRelacionados.map((p) => [p.productId, p]),
    );

    const notificationsComProduto = notifications.map((n) => {
      const produto = n.productId ? produtosPorId.get(n.productId) : undefined;
      return {
        ...n,
        product: produto
          ? {
              name: produto.name,
              imageUrl: produto.imageUrl,
              section: produto.section,
              diasRestantes: produto.expirationDate
                ? calcularDiasRestantes(produto.expirationDate)
                : null,
            }
          : null,
      };
    });

    res.status(200).json(notificationsComProduto);
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

export const subscribePush = async (
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

    if (!pushHabilitado) {
      res.status(503).json({
        error:
          "Notificações push não estão configuradas no servidor (chaves VAPID ausentes).",
      });
      return;
    }

    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {
      res.status(400).json({ error: "Dados de inscrição inválidos." });
      return;
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        keys: subscription.keys,
        userId: userId,
      },
      create: {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userId: userId,
      },
    });

    res.status(201).json({ message: "Inscrição push realizada com sucesso!" });
  } catch (error: any) {
    res.status(500).json({
      error: "Erro ao salvar inscrição push.",
      details: error.message,
    });
  }
};
