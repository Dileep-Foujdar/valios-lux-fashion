import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getBrandsAndStats,
  getInventoryStats,
  exportProducts,
  bulkProducts,
  getProductAnalytics
} from "../controllers/productController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();
const adminOnly = [isAuthenticated, authorizeRoles("Admin", "Owner", "Super Admin")];

router.get("/", getProducts);
router.get("/categories", getCategories);
router.get("/brands-stats", getBrandsAndStats);
router.get("/inventory-stats", ...adminOnly, getInventoryStats);
router.get("/export", ...adminOnly, exportProducts);
router.post("/bulk", ...adminOnly, validateBody(["action", "ids"]), bulkProducts);
router.get("/:id/analytics", ...adminOnly, getProductAnalytics);
router.get("/:id", getProductById);

router.post(
  "/",
  ...adminOnly,
  validateBody(["title", "description", "sku", "mrp", "salePrice", "brand", "category", "subcategory", "stock"]),
  createProduct
);

router.put("/:id", ...adminOnly, updateProduct);
router.delete("/:id", ...adminOnly, deleteProduct);

export default router;
