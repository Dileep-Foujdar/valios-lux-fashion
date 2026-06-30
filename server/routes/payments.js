import express from "express";
import {
  processStripePayment,
  processRazorpayPayment,
  verifyPayment
} from "../controllers/paymentController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();

router.post("/stripe", isAuthenticated, validateBody(["orderId"]), processStripePayment);
router.post("/razorpay", isAuthenticated, validateBody(["orderId"]), processRazorpayPayment);
router.post("/verify", isAuthenticated, validateBody(["gateway", "orderId"]), verifyPayment);

export default router;
