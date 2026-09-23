import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";

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
 * da rota (ele depende de authReq.userRole já estar preenchido).
 * Bloqueia o acesso de qualquer usuário que não seja "admin".
 *
 * Exemplo de uso:
 *   router.get("/", protegerRota, apenasAdmin, getAuditLogs);
 */
export const apenasAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authReq = req as AuthenticatedRequest;

  if (authReq.userRole?.toLowerCase() !== "admin") {
    res.status(403).json({
      error: "Acesso negado. Esta ação requer privilégios de administrador.",
    });
    return;
  }

  next();
};
