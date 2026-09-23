import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PAGE_SIZE_PADRAO = 10;
const PAGE_SIZE_MAXIMO = 50;

// Quantos dias de histórico manter antes de apagar. Configurável via env
// (AUDIT_LOG_RETENTION_DIAS) sem precisar mexer no código; 90 é o padrão.
const RETENCAO_DIAS_PADRAO = 90;

export const getAuditLogs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const pageSize = Math.min(
      PAGE_SIZE_MAXIMO,
      Math.max(1, parseInt(String(req.query.pageSize)) || PAGE_SIZE_PADRAO),
    );
    const action = req.query.action ? String(req.query.action) : undefined;
    const search = req.query.search
      ? String(req.query.search).trim()
      : undefined;

    const where: Prisma.AuditLogsWhereInput = {};

    if (action && action !== "TODOS") {
      where.action = action;
    }

    if (search) {
      where.OR = [
        { details: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLogs.findMany({
        where,
        orderBy: { timestamp: "desc" },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLogs.count({ where }),
    ]);

    res.status(200).json({ logs, total, page, pageSize });
  } catch (error: any) {
    res.status(500).json({
      error: "Erro ao buscar histórico de auditoria.",
      details: error.message,
    });
  }
};

/**
 * Apaga registros de AuditLogs mais antigos que o período de retenção
 * configurado. Pensado pra rodar periodicamente via cron (ver
 * server/src/jobs/limpezaAuditoria.ts) e também disparável manualmente
 * via webhook HTTP autenticado (dispararLimpezaAuditoriaJob abaixo).
 */
export async function limparLogsAntigos(): Promise<number> {
  const retencaoDias =
    parseInt(process.env.AUDIT_LOG_RETENTION_DIAS || "") ||
    RETENCAO_DIAS_PADRAO;

  const dataLimite = new Date();
  dataLimite.setUTCDate(dataLimite.getUTCDate() - retencaoDias);

  const resultado = await prisma.auditLogs.deleteMany({
    where: {
      timestamp: { lt: dataLimite },
    },
  });

  console.log(
    `[auditoria] ${resultado.count} registro(s) com mais de ${retencaoDias} dias removido(s).`,
  );

  return resultado.count;
}

/**
 * Endpoint HTTP para disparar a limpeza externamente (ex: cron-job.org),
 * seguindo o mesmo padrão de autenticação por token usado no job de
 * verificação de vencimentos.
 */
export async function dispararLimpezaAuditoriaJob(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const tokenSecretConfig = process.env.JOB_SECRET_TOKEN;

    if (!tokenSecretConfig || authHeader !== `Bearer ${tokenSecretConfig}`) {
      res
        .status(401)
        .json({ error: "Não autorizado: Token inválido ou ausente." });
      return;
    }

    const totalRemovido = await limparLogsAntigos();

    res.status(200).json({
      success: true,
      message: "Limpeza de auditoria executada com sucesso!",
      totalRemovido,
    });
  } catch (error: any) {
    console.error("[auditoria] Erro ao executar limpeza:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno ao processar limpeza de auditoria",
      details: error.message,
    });
  }
}
