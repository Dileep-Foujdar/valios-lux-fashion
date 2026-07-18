import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  returnOrReplaceOrder,
  getAllOrders
} from "../controllers/orderController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();

// Customer placing & viewing their own orders
router.post("/", isAuthenticated, validateBody(["items", "shippingAddress", "paymentMethod"]), createOrder);
router.get("/my", isAuthenticated, getMyOrders);

// Admin / Owner / Delivery Partner fetching ALL orders
router.get(
  "/",
  isAuthenticated,
  authorizeRoles("Admin", "Owner", "Super Admin", "Delivery Partner"),
  getAllOrders
);

// Detailed tracking / single order
router.get("/:id", isAuthenticated, getOrderById);

// Order actions
router.put("/:id/cancel", isAuthenticated, cancelOrder);
router.put("/:id/return", isAuthenticated, validateBody(["action", "reason"]), returnOrReplaceOrder);

// Status update (Admin / Owner / Delivery)
router.put(
  "/:id/status",
  isAuthenticated,
  authorizeRoles("Admin", "Owner", "Super Admin", "Delivery Partner"),
  updateOrderStatus
);

export default router;
