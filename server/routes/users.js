import express from "express";
import {
  getProfile,
  updateProfile,
  addAddress,
  deleteAddress,
  getCart,
  addToCart,
  updateCartItem,
  toggleWishlist,
  toggleLike,
  getWalletAndReferrals
} from "../controllers/userController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();

// Profile Routes
router.get("/profile", isAuthenticated, getProfile);
router.put("/profile", isAuthenticated, updateProfile);

// Address Routes
router.post("/address", isAuthenticated, validateBody(["name", "phone", "street", "city", "state", "zipCode"]), addAddress);
router.delete("/address/:id", isAuthenticated, deleteAddress);

// Cart Routes
router.get("/cart", isAuthenticated, getCart);
router.post("/cart", isAuthenticated, validateBody(["productId", "quantity"]), addToCart);
router.put("/cart/:itemId", isAuthenticated, updateCartItem);

// Wishlist & Likes
router.post("/wishlist", isAuthenticated, validateBody(["productId"]), toggleWishlist);
router.post("/like", isAuthenticated, validateBody(["productId"]), toggleLike);

// Wallet & Referral details
router.get("/wallet-referrals", isAuthenticated, getWalletAndReferrals);

export default router;
