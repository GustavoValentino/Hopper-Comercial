import cron from "node-cron";
import { verificarVencimentosCriticos } from "../controllers/notificationController.js";

export function iniciarJobVerificacaoVencimentos(): void {
  // Agendamento oficial
  cron.schedule(
    "0 7 * * *",
    async () => {
      console.log("[cron] Iniciando verificação diária...");
      try {
        await verificarVencimentosCriticos();
        console.log("[cron] Verificação diária concluída com sucesso.");
      } catch (error) {
        console.error(
          "[cron] Erro ao executar a verificação diária de vencimentos:",
          error,
        );
      }
    },
    { timezone: "America/Sao_Paulo" },
  );

  console.log("[cron] Job de verificação de vencimentos pronto.");
}
