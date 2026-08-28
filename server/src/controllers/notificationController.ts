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
import { notificarWhatsappSeAtivo } from "../lib/whatsappNotify.js";

const prisma = new PrismaClient();

const JANELA_ALERTA_DIAS = 15;

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
    "[web-push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas — notificações push desativadas.",
  );
}

async function dispararPushEEmail(
  userId: string,
  userEmail: string | null | undefined,
  produtoNome: string,
  produtoId: string,
  loteNumero: string,
  mensagemTexto: string,
  mensagemDias: string,
  setor: string,
): Promise<void> {
  if (pushHabilitado) {
    try {
      const userSubscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
      });

      const pushPayload = JSON.stringify({
        title: "Alerta de Vencimento - Hopper",
        body: mensagemTexto,
        url: "/",
        tag: `produto-${produtoId}-lote-${loteNumero}`,
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

  if (userEmail) {
    console.log(
      `[mailer] Disparando alerta para ${userEmail} (produto: ${produtoNome} - Lote: ${loteNumero}).`,
    );
    enviarEmail({
      to: userEmail,
      subject: `[Hopper] ${produtoNome} (Lote: ${loteNumero}) — ${mensagemDias}`,
      html: templateAlertaVencimento({
        nomeProduto: `${produtoNome} [Lote: ${loteNumero}]`,
        setor,
        mensagemDias,
        responsavel: null,
      }),
    });
  }
}

/**
 * Varre os LOTES de todos os produtos do sistema buscando
 * os que entraram na janela crítica de vencimento, e gera o alerta
 * (notificação interna + push + e-mail + WhatsApp) para o DONO de cada produto.
 */
export async function verificarVencimentosCriticos(): Promise<void> {
  const hoje = getHojeNoFusoBrasil();
  const limiteCritico = new Date(hoje);
  limiteCritico.setUTCDate(limiteCritico.getUTCDate() + JANELA_ALERTA_DIAS);

  // Busca produtos incluindo seus lotes e dados do usuário proprietário
  const produtosComLotes = await prisma.product.findMany({
    include: {
      lotes: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  let totalLotesNaJanela = 0;

  for (const produto of produtosComLotes) {
    if (!produto.user || !produto.lotes || produto.lotes.length === 0) continue;

    const donoId = produto.user.id;
    const setor =
      (produto as any).category || (produto as any).section || "Geral";

    for (const lote of produto.lotes) {
      if (!lote.expirationDate) continue;

      const expDate = normalizarDataUTC(lote.expirationDate);
      const diffTime = expDate.getTime() - hoje.getTime();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Verifica se está dentro da janela de alerta (não vencido há muito tempo, e até o limite crítico)
      if (diasRestantes >= 0 && diasRestantes <= JANELA_ALERTA_DIAS) {
        totalLotesNaJanela++;
        const loteIdOuNumero = lote.lotNumber || "Principal";

        // Evita duplicar notificações se o job rodar várias vezes no mesmo dia para o mesmo lote
        const alertaExistente = await prisma.notification.findFirst({
          where: {
            userId: donoId,
            productId: produto.productId,
            type: "CRITICAL_EXPIRY",
            message: { contains: `lote ${loteIdOuNumero}` },
            createdAt: { gte: hoje },
          },
        });

        if (alertaExistente) continue;

        const mensagemDias =
          diasRestantes === 0
            ? "vence HOJE!"
            : `vence em ${diasRestantes} dias!`;
        const mensagemTexto = `[URGENTE] O produto '${produto.name}' (Lote: ${loteIdOuNumero}) no setor ${setor} ${mensagemDias}.`;

        // 1. Notificação Interna
        await prisma.notification.create({
          data: {
            userId: donoId,
            productId: produto.productId,
            type: "CRITICAL_EXPIRY",
            message: mensagemTexto,
            isRead: false,
          },
        });

        // 2. Push e E-mail
        await dispararPushEEmail(
          donoId,
          produto.user.email,
          produto.name,
          produto.productId,
          loteIdOuNumero,
          mensagemTexto,
          mensagemDias,
          setor,
        );

        // 3. WhatsApp (Ativado se faltarem 5 dias ou menos)
        if (diasRestantes <= 5) {
          await notificarWhatsappSeAtivo(
            donoId,
            `⚠️ *Hopper — Alerta de validade*\n\nO produto *${produto.name}* (Lote: *${loteIdOuNumero}*) no setor *${setor}* ${mensagemDias}\n\nVerifique a gôndola agora.`,
          );
        }
      }
    }
  }

  console.log(
    `[cron] ${totalLotesNaJanela} lote(s) processado(s) na janela de alerta de vencimento.`,
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
          include: { lotes: true },
        })
      : [];

    const produtosPorId = new Map(
      produtosRelacionados.map((p) => [p.productId, p]),
    );

    const notificationsComProduto = notifications.map((n) => {
      const produto = n.productId ? produtosPorId.get(n.productId) : undefined;

      // Encontra a menor data de vencimento entre os lotes do produto (lote mais próximo de vencer)
      let menorDiasRestantes: number | null = null;
      if (produto && produto.lotes && produto.lotes.length > 0) {
        const diasDosLotes = produto.lotes
          .map((lote) =>
            lote.expirationDate
              ? calcularDiasRestantes(lote.expirationDate)
              : null,
          )
          .filter((d): d is number => d !== null);

        if (diasDosLotes.length > 0) {
          menorDiasRestantes = Math.min(...diasDosLotes);
        }
      }

      return {
        ...n,
        product: produto
          ? {
              name: produto.name,
              imageUrl: produto.imageUrl,
              section: produto.section,
              diasRestantes: menorDiasRestantes,
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
