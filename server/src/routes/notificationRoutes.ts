import { Router } from "express";
import {
  getNotifications,
  createNotification,
  markAllAsRead,
  markAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";
import { protegerRota } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", protegerRota, getNotifications);
router.post("/", protegerRota, createNotification);
router.patch("/read-all", protegerRota, markAllAsRead);
router.patch("/:id/read", protegerRota, markAsRead);
router.delete("/:id", protegerRota, deleteNotification);

export default router;
