import { Router } from "express";
import {
  getNotifications,
  createNotification,
  markAllAsRead,
  markAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";

const router = Router();

router.get("/", getNotifications);
router.post("/", createNotification);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
