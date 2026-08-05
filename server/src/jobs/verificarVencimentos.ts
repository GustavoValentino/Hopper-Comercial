import cron from "node-cron";
import { verificarVencimentosCriticos } from "../controllers/notificationController.js";

/**
 * Roda todo dia às 07:00 (horário de Brasília), verificando produtos
 * de TODOS os usuários e disparando notificação interna + push + e-mail
 * para os que entraram na janela crítica — sem depender de ninguém
 * estar com o app aberto.
 */
export function iniciarJobVerificacaoVencimentos(): void {
  cron.schedule(
    "0 7 * * *",
    () => {
      console.log("[cron] Iniciando verificação diária de vencimentos...");
      verificarVencimentosCriticos()
        .then(() => console.log("[cron] Verificação diária concluída."))
        .catch((err) =>
          console.error("[cron] Erro na verificação de vencimentos:", err),
        );
    },
    { timezone: "America/Sao_Paulo" },
  );

  console.log("[cron] Job de verificação de vencimentos agendado (07:00 BRT).");
}
