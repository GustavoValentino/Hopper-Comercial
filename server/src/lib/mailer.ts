const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const EMAIL_USER = process.env.EMAIL_USER || "";

// Mesmo padrão de configuração usada em authController.ts (verificação
// de e-mail e recuperação de senha) — API REST da Brevo, não SMTP.
// Sem chave/remetente configurados, o envio fica desativado (com aviso
// no log) em vez de quebrar o fluxo que chamou esta função.
export const emailHabilitado = Boolean(BREVO_API_KEY && EMAIL_USER);

if (!emailHabilitado) {
  console.warn(
    "[mailer] BREVO_API_KEY/EMAIL_USER não configurados no .env — envio de e-mail desativado.",
  );
}

interface EnviarEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envia um e-mail via API REST da Brevo. Nunca lança exceção — retorna
 * `false` em caso de falha (config ausente ou erro de envio), para que
 * uma notificação por e-mail nunca quebre o fluxo principal da aplicação.
 */
export async function enviarEmail({
  to,
  subject,
  html,
}: EnviarEmailParams): Promise<boolean> {
  if (!emailHabilitado) {
    console.warn(`[mailer] Envio ignorado (desativado): "${subject}" -> ${to}`);
    return false;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "Hopper", email: EMAIL_USER },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Brevo API error (${response.status}): ${errorBody}`);
    }

    console.log(`[mailer] E-mail enviado com sucesso: "${subject}" -> ${to}`);
    return true;
  } catch (error) {
    console.error("[mailer] Erro ao enviar e-mail:", error);
    return false;
  }
}

/**
 * Template de e-mail para alerta crítico de vencimento, seguindo a
 * MESMA identidade visual dos e-mails de verificação/recuperação de
 * senha (authController.ts): header azul-marinho com ícone circular,
 * barra degradê verde, cartão branco de 580px, box de destaque e
 * rodapé padrão.
 */
export function templateAlertaVencimento({
  nomeProduto,
  setor,
  mensagemDias,
  responsavel,
}: {
  nomeProduto: string;
  setor: string;
  mensagemDias: string;
  responsavel?: string | null;
}): string {
  const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Alerta de Vencimento — Hopper</title>
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
                      <span style="font-size:26px; line-height:64px; display:block;">⚠️</span>
                    </div>
                    <h1 style="color:#f8fafc; font-size:20px; font-weight:700; margin:0 0 8px; letter-spacing:-0.3px;">
                      Alerta de vencimento
                    </h1>
                    <p style="color:#94a3b8; font-size:13px; margin:0; line-height:1.5;">
                      Um produto do seu inventário exige atenção imediata
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
                      ${nomeProduto}
                    </p>
                    <p style="color:#6b7280; font-size:13px; margin:0 0 24px;">
                      Setor: <strong>${setor}</strong>${
                        responsavel
                          ? ` · Responsável: <strong>${responsavel}</strong>`
                          : ""
                      }
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                      <tr>
                        <td style="background-color:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:14px 18px;">
                          <p style="color:#b91c1c; font-size:13px; font-weight:700; line-height:1.6; margin:0;">
                            ⏱️ &nbsp;${mensagemDias}
                          </p>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${appUrl}"
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
                            Acessar o Hopper
                          </a>
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
                      Verifique a gôndola e tome as ações necessárias o quanto antes.
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
</html>`;
}
