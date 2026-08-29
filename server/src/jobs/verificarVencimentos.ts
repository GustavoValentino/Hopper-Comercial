import cron from "node-cron";
import { verificarVencimentosCriticos } from "../controllers/notificationController.js";

export function iniciarJobVerificacaoVencimentos(): void {
  // Agendamento oficial
  cron.schedule(
    "0 7 * * *",
    () => {
      console.log("[cron] Iniciando verificação diária...");
      verificarVencimentosCriticos().catch(console.error);
    },
    { timezone: "America/Sao_Paulo" },
  );

  console.log("[cron] Job de verificação de vencimentos pronto.");
}
