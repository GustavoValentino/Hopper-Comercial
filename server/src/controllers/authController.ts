import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dns from "dns/promises";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

// Cria o transporter resolvendo o host para IPv4 manualmente,
// contornando o ENETUNREACH causado por endereços IPv6 do Gmail
// não alcançáveis pela rede do Render.
async function getTransporter() {
  const originalHost = process.env.EMAIL_HOST || "smtp.gmail.com";
  let host = originalHost;

  try {
    const addresses = await dns.resolve4(originalHost);
    if (addresses.length > 0) {
      host = addresses[0];
    }
  } catch (err) {
    console.error(
      "⚠️ Falha ao resolver IPv4 para o host de e-mail, usando hostname original:",
      err,
    );
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    tls: {
      servername: originalHost, // necessário para o TLS validar o certificado corretamente
    },
    socketTimeout: 10000,
    dnsTimeout: 10000,
    connectionTimeout: 10000,
    auth: {
      user: process.env.EMAIL_USER?.trim().toLowerCase(),
      pass: process.env.EMAIL_PASS?.replace(/\s/g, ""),
    },
  } as any);
}

export const requestPasswordReset = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "O campo e-mail é obrigatório." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(200).json({
        message:
          "Se o e-mail constar em nossa base, as instruções de redefinição foram enviadas.",
      });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiracao = new Date();
    expiracao.setHours(expiracao.getHours() + 1);

    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expiracao,
      } as any,
    });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Recuperação de Senha — Hopper</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size:13px; font-weight:700; color:#64748b; letter-spacing:2px; text-transform:uppercase;">Hopper</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff; border-radius:20px; overflow:hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.07);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#0f172a; padding: 40px 40px 36px; text-align:center;">
                    <div style="width:64px; height:64px; background-color:#1e293b; border-radius:50%; margin:0 auto 20px; border: 1.5px solid #334155;">
                      <span style="font-size:26px; line-height:64px; display:block;">📬</span>
                    </div>
                    <h1 style="color:#f8fafc; font-size:20px; font-weight:700; margin:0 0 8px; letter-spacing:-0.3px;">
                      Redefinição de senha
                    </h1>
                    <p style="color:#94a3b8; font-size:13px; margin:0; line-height:1.5;">
                      Uma solicitação de recuperação de senha foi feita para sua conta no Hopper
                    </p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:3px; background: linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%);"></td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 40px 40px 32px;">
                    <p style="color:#374151; font-size:15px; font-weight:600; margin:0 0 6px;">
                      Olá, ${user.name}
                    </p>
                    <p style="color:#6b7280; font-size:14px; line-height:1.7; margin:0 0 28px;">
                      Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha de acesso. Se não foi você, ignore este e-mail com segurança.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding-bottom: 32px;">
                          <a href="${resetUrl}"
                            style="
                              display: inline-block;
                              background-color: #10b981;
                              color: #ffffff;
                              font-size: 13px;
                              font-weight: 700;
                              text-decoration: none;
                              padding: 14px 40px;
                              border-radius: 10px;
                              letter-spacing: 0.8px;
                              text-transform: uppercase;
                            ">
                            Redefinir minha senha
                          </a>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                      <tr>
                        <td style="background-color:#fefce8; border:1px solid #fde68a; border-radius:10px; padding:14px 18px;">
                          <p style="color:#92400e; font-size:12px; line-height:1.6; margin:0;">
                            ⏱️ &nbsp;<strong>Este link expira em 1 hora.</strong> Após este período, será necessário solicitar um novo link de recuperação.
                          </p>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px 18px;">
                          <p style="color:#94a3b8; font-size:11px; margin:0 0 6px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                            Ou copie o link abaixo no navegador
                          </p>
                          <p style="color:#475569; font-size:11px; margin:0; word-break:break-all; line-height:1.6; font-family: monospace;">
                            ${resetUrl}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top: 1px solid #f1f5f9; padding: 24px 40px;">
                    <p style="color:#94a3b8; font-size:11px; line-height:1.7; margin:0; text-align:center;">
                      Se você não solicitou a redefinição de senha, nenhuma ação é necessária.<br/>
                      Sua senha permanece a mesma e sua conta está segura.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 28px;">
              <p style="color:#94a3b8; font-size:11px; margin:0; line-height:1.6;">
                © ${new Date().getFullYear()} Hopper · Este é um e-mail automático, não responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const transporter = await getTransporter();
    await transporter.sendMail({
      from: `"Hopper" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Redefinição de senha — Hopper",
      html: emailHtml,
    });

    res.status(200).json({
      message:
        "Se o e-mail constar em nossa base, as instruções de redefinição foram enviadas.",
    });
  } catch (error: any) {
    console.error("❌ ERRO AO ENVIAR EMAIL COM NODEMAILER:", error);
    res.status(500).json({
      error: "Falha interna ao processar recuperação de senha.",
      details: error.message,
    });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: "Token e nova senha são obrigatórios." });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gte: new Date() },
      } as any,
    });

    if (!user) {
      res
        .status(400)
        .json({ error: "O token de recuperação é inválido ou já expirou." });
      return;
    }

    const securedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      } as any,
    });

    await prisma.account.updateMany({
      where: {
        userId: user.id,
        providerId: "credential",
      },
      data: {
        password: securedPassword,
      },
    });

    res.status(200).json({
      message: "Senha atualizada com sucesso! Você já pode realizar o login.",
    });
  } catch (error: any) {
    console.error("❌ ERRO NO CONTROLLER DE RESET:", error);
    res.status(500).json({
      error: "Erro ao redefinir credenciais.",
      details: error.message,
    });
  }
};

export const sendVerificationEmail = async (
  userId: string,
  userEmail: string,
  userName: string,
): Promise<void> => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiracao = new Date();
  expiracao.setHours(expiracao.getHours() + 24);

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: token,
      emailVerificationExpires: expiracao,
    } as any,
  });

  const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${token}`;

  const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verificação de E-mail — Hopper</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size:13px; font-weight:700; color:#64748b; letter-spacing:2px; text-transform:uppercase;">Hopper</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff; border-radius:20px; overflow:hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.07);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#0f172a; padding: 40px 40px 36px; text-align:center;">
                    <div style="width:64px; height:64px; background-color:#1e293b; border-radius:50%; margin:0 auto 20px; border: 1.5px solid #334155;">
                      <span style="font-size:26px; line-height:64px; display:block;">🔑</span>
                    </div>
                    <h1 style="color:#f8fafc; font-size:20px; font-weight:700; margin:0 0 8px; letter-spacing:-0.3px;">
                      Confirme seu e-mail
                    </h1>
                    <p style="color:#94a3b8; font-size:13px; margin:0; line-height:1.5;">
                      Um último passo para ativar sua conta no Hopper
                    </p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:3px; background: linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%);"></td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 40px 40px 32px;">
                    <p style="color:#374151; font-size:15px; font-weight:600; margin:0 0 6px;">
                      Olá, ${userName} 👋
                    </p>
                    <p style="color:#6b7280; font-size:14px; line-height:1.7; margin:0 0 28px;">
                      Seu cadastro foi recebido com sucesso. Para ativar seu acesso e garantir a segurança da sua conta, clique no botão abaixo para verificar seu endereço de e-mail.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding-bottom: 32px;">
                          <a href="${verifyUrl}"
                            style="
                              display: inline-block;
                              background-color: #10b981;
                              color: #ffffff;
                              font-size: 13px;
                              font-weight: 700;
                              text-decoration: none;
                              padding: 14px 40px;
                              border-radius: 10px;
                              letter-spacing: 0.8px;
                              text-transform: uppercase;
                            ">
                            Verificar meu e-mail
                          </a>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                      <tr>
                        <td style="background-color:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:14px 18px;">
                          <p style="color:#166534; font-size:12px; line-height:1.6; margin:0;">
                            🔒 &nbsp;<strong>Este link expira em 24 horas.</strong> Após este período, será necessário realizar um novo cadastro.
                          </p>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px 18px;">
                          <p style="color:#94a3b8; font-size:11px; margin:0 0 6px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                            Ou copie o link abaixo no navegador
                          </p>
                          <p style="color:#475569; font-size:11px; margin:0; word-break:break-all; line-height:1.6; font-family: monospace;">
                            ${verifyUrl}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top: 1px solid #f1f5f9; padding: 24px 40px;">
                    <p style="color:#94a3b8; font-size:11px; line-height:1.7; margin:0; text-align:center;">
                      Se você não realizou este cadastro, nenhuma ação é necessária.<br/>
                      Este e-mail pode ser ignorado com segurança.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 28px;">
              <p style="color:#94a3b8; font-size:11px; margin:0; line-height:1.6;">
                © ${new Date().getFullYear()} Hopper · Este é um e-mail automático, não responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const transporter = await getTransporter();
  await transporter.sendMail({
    from: `"Hopper" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: "Confirme seu e-mail — Hopper",
    html: emailHtml,
  });
};

export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Token de verificação inválido." });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gte: new Date() },
      } as any,
    });

    if (!user) {
      res.status(400).json({
        error: "O link de verificação é inválido ou já expirou.",
      });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      } as any,
    });

    res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/login?verified=true`,
    );
  } catch (error: any) {
    console.error("❌ ERRO NA VERIFICAÇÃO DE EMAIL:", error);
    res.status(500).json({
      error: "Erro interno ao verificar e-mail.",
      details: error.message,
    });
  }
};

export const sendVerificationEmailRoute = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId, email, name } = req.body;

    if (!userId || !email || !name) {
      res.status(400).json({ error: "Dados incompletos." });
      return;
    }

    await sendVerificationEmail(userId, email, name);

    res.status(200).json({ message: "E-mail de verificação enviado." });
  } catch (error: any) {
    console.error("❌ ERRO AO ENVIAR EMAIL DE VERIFICAÇÃO:", error);
    res.status(500).json({
      error: "Falha ao enviar e-mail de verificação.",
      details: error.message,
    });
  }
};
