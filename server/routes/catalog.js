import express from "express";
import {
  listCatalogItems,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  reorderCatalogItems,
  listCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
} from "../controllers/catalogController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();
const adminOnly = [isAuthenticated, authorizeRoles("Admin", "Owner", "Super Admin")];

// Public catalog reads (enabled items only by default)
router.get("/items", listCatalogItems);
router.get("/categories", listCategoriesAdmin);

// Admin mutations
router.post("/items", ...adminOnly, createCatalogItem);
router.put("/items/reorder", ...adminOnly, reorderCatalogItems);
router.put("/items/:id", ...adminOnly, updateCatalogItem);
router.delete("/items/:id", ...adminOnly, deleteCatalogItem);

router.post("/categories", ...adminOnly, createCategory);
router.put("/categories/reorder", ...adminOnly, reorderCategories);
router.put("/categories/:id", ...adminOnly, updateCategory);
router.delete("/categories/:id", ...adminOnly, deleteCategory);

export default router;
