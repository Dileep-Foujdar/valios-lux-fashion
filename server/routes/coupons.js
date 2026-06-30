import express from "express";
import {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  validateCoupon
} from "../controllers/couponController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();

// Public verification
router.post("/validate", isAuthenticated, validateBody(["code", "cartSubtotal"]), validateCoupon);

// Admin-only CRUD actions
router.get("/", isAuthenticated, authorizeRoles("Admin", "Owner", "Super Admin"), getCoupons);
router.post(
  "/",
  isAuthenticated,
  authorizeRoles("Admin", "Owner", "Super Admin"),
  validateBody(["code", "discountType", "value", "expiryDate"]),
  createCoupon
);
router.put("/:id", isAuthenticated, authorizeRoles("Admin", "Owner", "Super Admin"), updateCoupon);
router.delete("/:id", isAuthenticated, authorizeRoles("Admin", "Owner", "Super Admin"), deleteCoupon);

export default router;
