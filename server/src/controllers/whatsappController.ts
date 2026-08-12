import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import {
  enfileirarMensagemWhatsapp,
  whatsappEstaConectado,
} from "../lib/whatsapp.js";
import crypto from "crypto";

const prisma = new PrismaClient();
const OTP_EXPIRACAO_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const MAX_TENTATIVAS = 5;

const gerarCodigoOtp = (): string =>
  crypto.randomInt(100000, 999999).toString();

const montarMensagemOtp = (codigo: string): string =>
  `🔐 *Hopper — Verificação de número*\n\n` +
  `Seu código de confirmação é:\n\n` +
  `*${codigo}*\n\n` +
  `Ele expira em 5 minutos. Se você não solicitou isso, pode ignorar esta mensagem com segurança.`;

export const requestWhatsappOtp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = authReq;
    const { phoneNumber } = authReq.body;

    if (!userId) {
      res.status(401).json({ message: "Usuário não autenticado." });
      return;
    }

    const apenasDigitos = (phoneNumber || "").replace(/\D/g, "");
    if (apenasDigitos.length < 10 || apenasDigitos.length > 13) {
      res.status(400).json({ message: "Número de WhatsApp inválido." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "Usuário não encontrado." });
      return;
    }

    if (
      user.whatsappOtpLastSentAt &&
      Date.now() - user.whatsappOtpLastSentAt.getTime() < OTP_COOLDOWN_MS
    ) {
      const restamSegundos = Math.ceil(
        (OTP_COOLDOWN_MS -
          (Date.now() - user.whatsappOtpLastSentAt.getTime())) /
          1000,
      );
      res.status(429).json({
        message: `Aguarde ${restamSegundos}s antes de solicitar um novo código.`,
      });
      return;
    }

    const codigo = gerarCodigoOtp();

    await prisma.user.update({
      where: { id: userId },
      data: {
        whatsappNumber: apenasDigitos,
        whatsappOtpCode: codigo,
        whatsappOtpExpires: new Date(Date.now() + OTP_EXPIRACAO_MS),
        whatsappOtpAttempts: 0,
        whatsappOtpLastSentAt: new Date(),
      },
    });

    enfileirarMensagemWhatsapp(apenasDigitos, montarMensagemOtp(codigo));

    res.status(200).json({
      message: "Código enviado! Verifique seu WhatsApp.",
      whatsappOnline: whatsappEstaConectado(),
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Erro ao solicitar código de verificação.",
      details: error.message,
    });
  }
};

export const verifyWhatsappOtp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = authReq;
    const { code } = authReq.body;

    if (!userId) {
      res.status(401).json({ message: "Usuário não autenticado." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.whatsappOtpCode || !user.whatsappOtpExpires) {
      res.status(400).json({ message: "Nenhuma verificação pendente." });
      return;
    }

    if (Date.now() > user.whatsappOtpExpires.getTime()) {
      res.status(400).json({ message: "Código expirado. Solicite um novo." });
      return;
    }

    if (user.whatsappOtpAttempts >= MAX_TENTATIVAS) {
      res.status(429).json({
        message: "Número de tentativas excedido. Solicite um novo código.",
      });
      return;
    }

    if (String(code).trim() !== user.whatsappOtpCode) {
      await prisma.user.update({
        where: { id: userId },
        data: { whatsappOtpAttempts: { increment: 1 } },
      });
      res.status(400).json({
        message: `Código incorreto. Tentativas restantes: ${
          MAX_TENTATIVAS - (user.whatsappOtpAttempts + 1)
        }.`,
      });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        whatsappOptIn: true,
        whatsappOtpCode: null,
        whatsappOtpExpires: null,
        whatsappOtpAttempts: 0,
      },
    });

    enfileirarMensagemWhatsapp(
      user.whatsappNumber!,
      `✅ *Hopper*\n\nSeu número foi confirmado com sucesso! A partir de agora você receberá alertas de produtos críticos por aqui.`,
    );

    res.status(200).json({ message: "Número confirmado com sucesso!" });
  } catch (error: any) {
    res.status(500).json({
      message: "Erro ao verificar código.",
      details: error.message,
    });
  }
};

export const disableWhatsapp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = authReq;

    if (!userId) {
      res.status(401).json({ message: "Usuário não autenticado." });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        whatsappOptIn: false,
        whatsappNumber: null,
        whatsappOtpCode: null,
        whatsappOtpExpires: null,
        whatsappOtpAttempts: 0,
      },
    });

    res.status(200).json({ message: "Notificações via WhatsApp desativadas." });
  } catch (error: any) {
    res.status(500).json({
      message: "Erro ao desativar WhatsApp.",
      details: error.message,
    });
  }
};

export const getWhatsappStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId } = authReq;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { whatsappOptIn: true, whatsappNumber: true },
    });

    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ message: "Erro ao buscar status do WhatsApp." });
  }
};
