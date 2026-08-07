import express from "express";
import {
  createReview,
  getProductReviews,
  getReviewSummary,
  deleteReview,
  replyToReview
} from "../controllers/reviewController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();

router.get("/:productId/summary", getReviewSummary);
router.get("/:productId", getProductReviews);

router.post("/", isAuthenticated, validateBody(["productId", "rating", "comment"]), createReview);
router.delete("/:id", isAuthenticated, deleteReview);

router.post(
  "/:id/reply",
  isAuthenticated,
  authorizeRoles("Admin", "Owner", "Super Admin"),
  validateBody(["comment"]),
  replyToReview
);

export default router;
