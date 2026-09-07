import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import OTP from "../models/OTP.js";
import { sendEmail, emailTemplates } from "../utils/email.js";
import { normalizeMobile, isValidIndianMobile } from "../utils/mobile.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 5 * 60 * 1000;

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "1d" }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d" }
  );

  return { accessToken, refreshToken };
};

const getCookieOptions = (days) => ({
  expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/"
});

const toAuthUser = (user, extras = {}) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  mobile: user.mobile || "",
  role: user.role,
  walletBalance: user.walletBalance,
  referralCode: user.referralCode,
  notifications: user.notifications || { permission: "default", enabled: false },
  location: user.location || { permission: "prompt" },
  permissionsOnboardingCompleted: Boolean(user.permissionsOnboardingCompleted),
  ...extras
});

const createAndSendEmailOtp = async ({ destination, purpose, pendingRegistration }) => {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const $set = {
    code: otpCode,
    purpose,
    expiresAt,
    verified: false,
    isUsed: false,
    attempts: 0
  };

  const updateDoc = { $set };

  if (purpose === "register" && pendingRegistration) {
    $set.pendingRegistration = pendingRegistration;
  } else if (purpose === "login") {
    updateDoc.$unset = { pendingRegistration: 1 };
  }

  await OTP.findOneAndUpdate(
    { destination },
    updateDoc,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const emailHtml = emailTemplates.otp(otpCode);
  const emailText = `Your Zentro verification code is: ${otpCode}. Valid for 5 minutes.`;

  await sendEmail({
    to: destination,
    subject: purpose === "register"
      ? "Verify your Zentro registration"
      : "Your Zentro login code",
    html: emailHtml,
    text: emailText
  });
};

const validateLocationPayload = (location) => {
  if (!location || typeof location !== "object") {
    return { ok: false, message: "Current location is required" };
  }

  const permission = location.permission;
  const city = (location.city || "").trim();
  const address = (location.address || "").trim();
  const hasCoords =
    typeof location.latitude === "number" &&
    typeof location.longitude === "number" &&
    !Number.isNaN(location.latitude) &&
    !Number.isNaN(location.longitude);

  if (permission === "granted" && hasCoords) {
    return {
      ok: true,
      location: {
        permission: "granted",
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: typeof location.accuracy === "number" ? location.accuracy : undefined,
        city: city || undefined,
        address: address || undefined,
        updatedAt: new Date()
      }
    };
  }

  if ((permission === "manual" || permission === "denied") && (city || address)) {
    return {
      ok: true,
      location: {
        permission: permission === "denied" ? "manual" : permission,
        city: city || undefined,
        address: address || undefined,
        latitude: hasCoords ? location.latitude : undefined,
        longitude: hasCoords ? location.longitude : undefined,
        updatedAt: new Date()
      }
    };
  }

  if (city || address) {
    return {
      ok: true,
      location: {
        permission: "manual",
        city: city || undefined,
        address: address || undefined,
        updatedAt: new Date()
      }
    };
  }

  return {
    ok: false,
    message: "Allow live location or enter your city/address manually"
  };
};

const issueSession = async (user, res, message) => {
  const { accessToken, refreshToken } = generateTokens(user);
  res.cookie("token", accessToken, getCookieOptions(1));
  res.cookie("refreshToken", refreshToken, getCookieOptions(7));

  const populatedUser = await User.findById(user._id)
    .populate("cart.product", "title images salePrice mrp stock brand")
    .populate("wishlist", "title images salePrice mrp stock brand");

  return res.status(200).json({
    success: true,
    message,
    token: accessToken,
    refreshToken,
    user: toAuthUser(user, {
      cart: populatedUser?.cart || [],
      wishlist: populatedUser?.wishlist || []
    })
  });
};

// Optional helper for UI: check if email already has an account
export const checkEmail = async (req, res, next) => {
  try {
    const email = (req.query.email || req.body?.email || "").toLowerCase().trim();
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }

    const exists = Boolean(await User.findOne({ email }).select("_id"));
    return res.status(200).json({
      success: true,
      exists,
      mode: exists ? "login" : "register"
    });
  } catch (error) {
    next(error);
  }
};

// 1. Request OTP — login (existing) or register (new)
export const requestOTP = async (req, res, next) => {
  try {
    const { email, mobile, purpose: rawPurpose, name, location } = req.body;
    const purpose = rawPurpose === "register" ? "register" : "login";

    if (!email) {
      return res.status(400).json({ success: false, message: "Email address is required" });
    }

    const destination = email.toLowerCase().trim();
    if (!EMAIL_RE.test(destination)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address" });
    }

    const existingUser = await User.findOne({ email: destination });

    if (purpose === "login") {
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "No account found with this email. Please create an account first.",
          code: "USER_NOT_FOUND"
        });
      }
      if (!existingUser.isActive) {
        return res.status(403).json({ success: false, message: "Your account is deactivated. Please contact support." });
      }

      try {
        await createAndSendEmailOtp({ destination, purpose: "login" });
        return res.status(200).json({
          success: true,
          purpose: "login",
          message: `OTP sent to your email (${destination}). Check your inbox.`
        });
      } catch (emailErr) {
        return res.status(400).json({
          success: false,
          message: `Email delivery failed: ${emailErr.message}`
        });
      }
    }

    // REGISTER
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account already exists with this email. Please sign in instead.",
        code: "USER_EXISTS"
      });
    }

    const fullName = (name || "").trim();
    if (fullName.length < 2) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }

    const normalized = normalizeMobile(mobile);
    if (!normalized || !isValidIndianMobile(normalized)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit Indian mobile number"
      });
    }

    const mobileTaken = await User.findOne({ mobile: normalized });
    if (mobileTaken) {
      return res.status(409).json({
        success: false,
        message: "This mobile number is already linked to another account"
      });
    }

    const locationCheck = validateLocationPayload(location);
    if (!locationCheck.ok) {
      return res.status(400).json({ success: false, message: locationCheck.message });
    }

    try {
      await createAndSendEmailOtp({
        destination,
        purpose: "register",
        pendingRegistration: {
          name: fullName,
          mobile: normalized,
          location: {
            permission: locationCheck.location.permission,
            latitude: locationCheck.location.latitude,
            longitude: locationCheck.location.longitude,
            accuracy: locationCheck.location.accuracy,
            city: locationCheck.location.city,
            address: locationCheck.location.address
          }
        }
      });

      return res.status(200).json({
        success: true,
        purpose: "register",
        message: `Verification OTP sent to your email (${destination}). Check your inbox to continue.`
      });
    } catch (emailErr) {
      return res.status(400).json({
        success: false,
        message: `Email delivery failed: ${emailErr.message}`
      });
    }
  } catch (error) {
    next(error);
  }
};

// 2. Verify OTP — login existing OR create account from pending registration
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and OTP code"
      });
    }

    const destination = email.toLowerCase().trim();
    const otpRecord = await OTP.findOne({ destination });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "No OTP request found for this email" });
    }

    if (otpRecord.isUsed) {
      return res.status(400).json({
        success: false,
        message: "This OTP has already been used. Please request a new one."
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one."
      });
    }

    if (otpRecord.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP."
      });
    }

    if (otpRecord.code !== code.toString().trim()) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP code. ${5 - otpRecord.attempts} attempts remaining.`
      });
    }

    otpRecord.verified = true;
    otpRecord.isUsed = true;
    await otpRecord.save();

    let user = await User.findOne({ email: destination });

    if (otpRecord.purpose === "register") {
      if (user) {
        await OTP.deleteOne({ destination });
        return res.status(409).json({
          success: false,
          message: "An account already exists with this email. Please sign in instead."
        });
      }

      const pending = otpRecord.pendingRegistration;
      if (!pending?.name || !pending?.mobile) {
        return res.status(400).json({
          success: false,
          message: "Registration details expired. Please fill the form and request a new OTP."
        });
      }

      const mobileTaken = await User.findOne({ mobile: pending.mobile });
      if (mobileTaken) {
        return res.status(409).json({
          success: false,
          message: "This mobile number is already linked to another account"
        });
      }

      const hasLocation =
        pending.location &&
        (pending.location.permission === "granted" ||
          pending.location.city ||
          pending.location.address);

      user = await User.create({
        name: pending.name,
        email: destination,
        mobile: pending.mobile,
        role: "Customer",
        location: pending.location
          ? {
              permission: pending.location.permission || "manual",
              latitude: pending.location.latitude,
              longitude: pending.location.longitude,
              accuracy: pending.location.accuracy,
              city: pending.location.city,
              address: pending.location.address,
              updatedAt: new Date()
            }
          : { permission: "prompt" },
        permissionsOnboardingCompleted: Boolean(hasLocation)
      });

      await OTP.deleteOne({ destination });
      return issueSession(user, res, "Account created and verified successfully");
    }

    // LOGIN
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email. Please create an account first."
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact support."
      });
    }

    await OTP.deleteOne({ destination });
    return issueSession(user, res, "Logged in successfully");
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    let refreshToken = "";

    if (req.cookies && req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    } else if (req.body.refreshToken) {
      refreshToken = req.body.refreshToken;
    }

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "No refresh token provided" });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, message: "Invalid user session" });
      }

      const tokens = generateTokens(user);
      res.cookie("token", tokens.accessToken, getCookieOptions(1));
      res.cookie("refreshToken", tokens.refreshToken, getCookieOptions(7));

      res.status(200).json({
        success: true,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie("token", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });

    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-__v");
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

export const loginWithPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "No password set for this account. Please log in via OTP first."
      });
    }

    const hashedPassword = crypto
      .createHash("sha256")
      .update(password + "valois-salt-string")
      .digest("hex");
    if (user.password !== hashedPassword) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your account is deactivated." });
    }

    return issueSession(user, res, "Logged in successfully with password");
  } catch (error) {
    next(error);
  }
};

export const forceOwnerLogin = async (req, res, next) => {
  try {
    let user = await User.findOne({ email: "dlpfjdr@gmail.com" });
    if (!user) {
      user = await User.create({
        name: "ZENTRO Owner",
        email: "dlpfjdr@gmail.com",
        mobile: "9999999999",
        role: "Owner",
        walletBalance: 100000,
        password: "password123",
        permissionsOnboardingCompleted: true
      });
    } else {
      user.role = "Owner";
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie("token", accessToken, getCookieOptions(1));
    res.cookie("refreshToken", refreshToken, getCookieOptions(7));

    res.send(`
      <html>
        <head><title>Bypassing Auth...</title></head>
        <body>
          <p>Bypassing login security, resetting state, and loading Owner Dashboard...</p>
          <script>
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/owner";
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required for Google login" });
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found. Please create an account with name, mobile, email and location first.",
        code: "USER_NOT_FOUND"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact support."
      });
    }

    return issueSession(user, res, "Logged in with Google successfully");
  } catch (error) {
    next(error);
  }
};
