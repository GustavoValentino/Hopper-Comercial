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

  // APENAS PARA TESTE: Roda 1 minuto após o servidor iniciar (Remova isso após validar)
  setTimeout(() => {
    console.log("[cron] Rodando teste de verificação de vencimentos...");
    verificarVencimentosCriticos().catch(console.error);
  }, 60000);

  console.log("[cron] Job de verificação de vencimentos pronto.");
}
