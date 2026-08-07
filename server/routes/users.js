import express from "express";
import {
  getProfile,
  updateProfile,
  updatePermissions,
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
import { reverseGeocode } from "../utils/geocode.js";

const router = express.Router();

// Profile Routes
router.get("/profile", isAuthenticated, getProfile);
router.put("/profile", isAuthenticated, updateProfile);
router.put("/permissions", isAuthenticated, updatePermissions);

// Reverse geocode for checkout live location (authenticated)
router.post("/geocode/reverse", isAuthenticated, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body || {};
    const result = await reverseGeocode(latitude, longitude);
    res.status(200).json({ success: true, address: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Geocode failed" });
  }
});

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
