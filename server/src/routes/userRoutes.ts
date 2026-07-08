import { Router } from "express";

import {
  getUsers,
  updateUserRole,
  deleteUser,
  updateUserSettings,
} from "../controllers/userController.js";

const router = Router();

router.get("/", getUsers);

router.patch("/:id/role", updateUserRole);

router.delete("/:id", deleteUser);

router.put("/update", updateUserSettings);

export default router;
