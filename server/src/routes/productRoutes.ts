import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "../controllers/productController.js";
import { protegerRota } from "../middlewares/authMiddleware.js";
import { lookupProductByEan } from "../controllers/productLookupController.js";

const router = Router();

router.get("/lookup/:ean", lookupProductByEan);
router.get("/", protegerRota, getProducts);
router.post("/", protegerRota, createProduct);
router.patch("/:id", protegerRota, updateProduct);
router.delete("/:id", protegerRota, deleteProduct);

export default router;
