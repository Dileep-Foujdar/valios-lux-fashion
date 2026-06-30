import express from "express";
import {
  getAssignedOrders,
  acceptOrder,
  rejectOrder,
  verifyDeliveryOTP,
  getEarnings
} from "../controllers/deliveryController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();

// Apply auth and role lock for all sub-routes
router.use(isAuthenticated, authorizeRoles("Delivery Partner"));

router.get("/assigned", getAssignedOrders);
router.put("/accept/:id", acceptOrder);
router.put("/reject/:id", rejectOrder);
router.put("/deliver/:id", validateBody(["otp"]), verifyDeliveryOTP);
router.get("/earnings", getEarnings);

export default router;
