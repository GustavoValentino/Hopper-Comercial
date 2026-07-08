import { Router } from "express";
import { getDashboardMetrics } from "../controllers/dashboardController.js";
import { protegerRota } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", protegerRota, getDashboardMetrics);

export default router;
