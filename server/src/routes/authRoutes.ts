import { Router } from "express";
import {
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  sendVerificationEmailRoute,
} from "../controllers/authController.js";

const router = Router();

router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.get("/verify-email", verifyEmail);
router.post("/send-verification-email", sendVerificationEmailRoute);

export default router;
