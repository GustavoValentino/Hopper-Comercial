import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth.js";

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const protegerRota = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const webHeaders = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => webHeaders.append(key, v));
      } else if (value !== undefined) {
        webHeaders.append(key, value);
      }
    });

    const session = await auth.api.getSession({
      headers: webHeaders,
    });

    if (!session) {
      res
        .status(401)
        .json({ error: "Acesso negado. Sessão inválida ou expirada." });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    authReq.userId = session.user.id;
    authReq.userRole = (session.user as any).role || "user";

    next();
  } catch (error) {
    res
      .status(401)
      .json({ error: "Erro interno ao validar a autenticação da sessão." });
  }
};

/**
 * Middleware de autorização — usar SEMPRE depois de protegerRota na cadeia
 * da rota (ele depende de authReq.userId já estar preenchido).
 * Bloqueia o acesso de qualquer usuário que não seja "admin".
 *
 * IMPORTANTE: não confiamos no "role" que o protegerRota tirou da SESSÃO
 * (authReq.userRole) pra essa checagem — o better-auth só inclui campos
 * customizados do modelo de usuário na sessão se isso for explicitamente
 * configurado (additionalFields), e aqui não está, então esse valor vem
 * sempre "user", mesmo pra admins de verdade. Por isso buscamos o role
 * direto do banco, que é a fonte de verdade — mesmo padrão que o resto
 * do app já usa (o UsersPage.tsx também não confia no role da sessão,
 * ele cruza com a lista de usuários vinda do banco).
 *
 * Essa consulta extra ao banco só acontece nas rotas que exigem admin
 * (raras), não em toda rota autenticada — por isso não entrou no
 * protegerRota, que roda em praticamente toda chamada do app.
 *
 * Exemplo de uso:
 *   router.get("/", protegerRota, apenasAdmin, getAuditLogs);
 */
export const apenasAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.userId) {
    res.status(401).json({ error: "Acesso negado. Sessão inválida." });
    return;
  }

  try {
    const usuarioDb = await prisma.user.findUnique({
      where: { id: authReq.userId },
      select: { role: true },
    });

    if (usuarioDb?.role?.toLowerCase() !== "admin") {
      res.status(403).json({
        error: "Acesso negado. Esta ação requer privilégios de administrador.",
      });
      return;
    }

    next();
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erro interno ao validar privilégios de acesso." });
  }
};
