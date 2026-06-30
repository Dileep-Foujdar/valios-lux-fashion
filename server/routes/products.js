import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getBrandsAndStats
} from "../controllers/productController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/categories", getCategories);
router.get("/brands-stats", getBrandsAndStats);
router.get("/:id", getProductById);

// Admin / Owner Routes
router.post(
  "/",
  isAuthenticated,
  authorizeRoles("Admin", "Owner", "Super Admin"),
  validateBody(["title", "description", "sku", "mrp", "salePrice", "brand", "category", "subcategory", "stock"]),
  createProduct
);

router.put(
  "/:id",
  isAuthenticated,
  authorizeRoles("Admin", "Owner", "Super Admin"),
  updateProduct
);

router.delete(
  "/:id",
  isAuthenticated,
  authorizeRoles("Admin", "Owner", "Super Admin"),
  deleteProduct
);

export default router;
