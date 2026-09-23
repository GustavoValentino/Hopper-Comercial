import { Router } from "express";
import { getAuditLogs } from "../controllers/auditController.js";
import { protegerRota, apenasAdmin } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", protegerRota, apenasAdmin, getAuditLogs);

export default router;
