import { Router } from "express";
import {
  requestWhatsappOtp,
  verifyWhatsappOtp,
  disableWhatsapp,
  getWhatsappStatus,
} from "../controllers/whatsappController.js";
import { protegerRota } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/status", protegerRota, getWhatsappStatus);
router.post("/request-otp", protegerRota, requestWhatsappOtp);
router.post("/verify-otp", protegerRota, verifyWhatsappOtp);
router.post("/disable", protegerRota, disableWhatsapp);

export default router;
