import express from "express";
import {
  createReview,
  getProductReviews,
  deleteReview,
  replyToReview
} from "../controllers/reviewController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();

// Public feedback retrieval
router.get("/:productId", getProductReviews);

// Authenticated feedback actions
router.post("/", isAuthenticated, validateBody(["productId", "rating", "comment"]), createReview);
router.delete("/:id", isAuthenticated, deleteReview);

// Admin or Owner replies to reviews
router.post(
  "/:id/reply",
  isAuthenticated,
  authorizeRoles("Admin", "Owner", "Super Admin"),
  validateBody(["comment"]),
  replyToReview
);

export default router;
