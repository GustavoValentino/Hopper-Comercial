import { Router, Request, Response } from "express";
import { verificarVencimentosCriticos } from "../controllers/notificationController.js";

const router = Router();

const verificarTokenJob = (req: Request, res: Response, next: Function) => {
  const token = req.headers["x-job-secret"];
  const tokenEsperado = process.env.JOB_SECRET_TOKEN;

  if (!tokenEsperado || token !== tokenEsperado) {
    res.status(401).json({ error: "Token inválido ou ausente." });
    return;
  }

  next();
};

router.post(
  "/verificar-vencimentos",
  verificarTokenJob,
  async (req: Request, res: Response) => {
    try {
      console.log("[job] Verificação de vencimentos disparada via HTTP...");
      await verificarVencimentosCriticos();
      res.status(200).json({
        success: true,
        message: "Verificação de vencimentos concluída com sucesso.",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[job] Erro ao verificar vencimentos:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
