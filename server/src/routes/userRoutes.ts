import { Router } from "express";

import {
  getUsers,
  updateUserRole,
  deleteUser,
  updateUserSettings,
} from "../controllers/userController.js";
import { protegerRota, apenasAdmin } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", protegerRota, getUsers);

router.patch("/:id/role", protegerRota, apenasAdmin, updateUserRole);
router.delete("/:id", protegerRota, apenasAdmin, deleteUser);

router.put("/update", protegerRota, updateUserSettings);

export default router;
