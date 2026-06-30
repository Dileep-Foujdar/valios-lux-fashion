import express from "express";
import { requestOTP, verifyOTP, refreshAccessToken, logout, getCurrentUser, loginWithPassword, forceOwnerLogin } from "../controllers/authController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { otpLimiter } from "../middleware/security.js";
import { validateBody } from "../middleware/validate.js";

const router = express.Router();

router.post("/otp/request", otpLimiter, requestOTP);
router.post("/otp/verify", verifyOTP);
router.post("/password/login", loginWithPassword);
router.get("/force-owner", forceOwnerLogin);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);
router.get("/me", isAuthenticated, getCurrentUser);

export default router;
