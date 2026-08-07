import express from "express";
import {
  getAssignedOrders,
  acceptOrder,
  rejectOrder,
  verifyDeliveryOTP,
  getEarnings
} from "../controllers/deliveryController.js";
import {
  requestPartnerOtp,
  verifyPartnerOtp,
  registerPartner,
  getPartnerMe,
  updatePartnerProfile,
  partnerPresign,
  getDashboardStats,
  listOffers,
  listMyAssignments,
  acceptAssignment,
  rejectAssignment,
  updateAssignmentStatus
} from "../controllers/partnerController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { otpLimiter, partnerRegisterLimiter, partnerAcceptLimiter } from "../middleware/security.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// —— Public partner auth (separate from customer /auth) ——
router.post("/auth/otp/request", otpLimiter, requestPartnerOtp);
router.post("/auth/otp/verify", otpLimiter, verifyPartnerOtp);
router.post("/auth/register", partnerRegisterLimiter, registerPartner);

// Presign for applicants (auth OR registration token) and approved partners
router.post("/uploads/presign", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return isAuthenticated(req, res, () => partnerPresign(req, res, next));
    }
    const { registrationToken } = req.body || {};
    if (!registrationToken) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    try {
      const decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
      if (decoded.purpose !== "delivery_register_verified") {
        return res.status(401).json({ success: false, message: "Invalid registration token" });
      }
      req.registrationEmail = decoded.email;
      return partnerPresign(req, res, next);
    } catch {
      return res.status(401).json({ success: false, message: "Registration token expired" });
    }
  } catch (error) {
    next(error);
  }
});

// —— Authenticated partner APIs ——
router.use(isAuthenticated, authorizeRoles("Delivery Partner"));

router.get("/me", getPartnerMe);
router.put("/me", updatePartnerProfile);
router.get("/dashboard", getDashboardStats);
router.get("/offers", listOffers);
router.get("/assignments", listMyAssignments);
router.put("/assignments/:id/accept", partnerAcceptLimiter, acceptAssignment);
router.put("/assignments/:id/reject", rejectAssignment);
router.put("/assignments/:id/status", updateAssignmentStatus);

// Legacy order-based endpoints (kept for compatibility)
router.get("/assigned", getAssignedOrders);
router.put("/accept/:id", acceptOrder);
router.put("/reject/:id", rejectOrder);
router.put("/deliver/:id", validateBody(["otp"]), verifyDeliveryOTP);
router.get("/earnings", getEarnings);

export default router;
