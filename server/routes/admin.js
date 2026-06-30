import express from "express";
import {
  getDashboardStats,
  getSettings,
  updateSettings,
  getAllUsers,
  updateUserRoleAndStatus
} from "../controllers/adminController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";

import { seedDatabase } from "../utils/seed.js";

const router = express.Router();

// Publicly readable storefront details (SEO, themes, banners)
router.get("/settings", getSettings);
router.get("/force-seed", async (req, res, next) => {
  try {
    await seedDatabase(true);
    res.status(200).json({ success: true, message: "Database re-seeded with 54 premium products across 9 categories!" });
  } catch (err) {
    next(err);
  }
});

// Admin-locked endpoints
router.get("/stats", isAuthenticated, authorizeRoles("Admin", "Owner", "Super Admin"), getDashboardStats);
router.put("/settings", isAuthenticated, authorizeRoles("Admin", "Owner", "Super Admin"), updateSettings);
router.get("/users", isAuthenticated, authorizeRoles("Admin", "Owner", "Super Admin"), getAllUsers);
router.put("/users/:id", isAuthenticated, authorizeRoles("Admin", "Owner", "Super Admin"), updateUserRoleAndStatus);

export default router;
