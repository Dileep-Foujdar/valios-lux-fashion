import express from "express";
import {
  checkEmail,
  requestOTP,
  verifyOTP,
  refreshAccessToken,
  logout,
  getCurrentUser,
  loginWithPassword,
  forceOwnerLogin,
  googleLogin
} from "../controllers/authController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { otpLimiter } from "../middleware/security.js";

const router = express.Router();

router.get("/check-email", checkEmail);
router.post("/otp/request", otpLimiter, requestOTP);
router.post("/otp/verify", verifyOTP);
router.post("/google-login", googleLogin);
router.post("/password/login", loginWithPassword);
router.get("/force-owner", forceOwnerLogin);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);
router.get("/me", isAuthenticated, getCurrentUser);

export default router;
