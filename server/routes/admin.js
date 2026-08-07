import express from "express";
import {
  getDashboardStats,
  getSettings,
  updateSettings,
  getAllUsers,
  updateUserRoleAndStatus
} from "../controllers/adminController.js";
import {
  adminListPartners,
  adminGetPartner,
  adminUpdatePartnerStatus,
  adminCreateOffer,
  adminDeliveryOverview,
  adminListAssignments
} from "../controllers/partnerController.js";
import { isAuthenticated, authorizeRoles, optionalAuth } from "../middleware/auth.js";

import { seedDatabase } from "../utils/seed.js";

const router = express.Router();

// Storefront-readable settings (sanitized for guests; full for admins via optionalAuth)
router.get("/settings", optionalAuth, getSettings);
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

// Delivery partners & assignments
const adminOnly = [isAuthenticated, authorizeRoles("Admin", "Owner", "Super Admin")];
router.get("/delivery/partners", ...adminOnly, adminListPartners);
router.get("/delivery/partners/:id", ...adminOnly, adminGetPartner);
router.put("/delivery/partners/:id", ...adminOnly, adminUpdatePartnerStatus);
router.get("/delivery/overview", ...adminOnly, adminDeliveryOverview);
router.get("/delivery/assignments", ...adminOnly, adminListAssignments);
router.post("/delivery/offers", ...adminOnly, adminCreateOffer);

export default router;
