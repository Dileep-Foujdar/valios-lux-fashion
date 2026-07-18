import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import OTP from "../models/OTP.js";
import { sendEmail, emailTemplates } from "../utils/email.js";
import { sendSMS, smsTemplates } from "../utils/sms.js";

// Helper to generate JWT tokens
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

// Cookie options helper
const getCookieOptions = (days) => {
  return {
    expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  };
};

// 1. Request OTP (Email or Mobile)
export const requestOTP = async (req, res, next) => {
  try {
    const { email, mobile } = req.body;

    if (!email && !mobile) {
      return res.status(400).json({ success: false, message: "Please provide email or mobile number" });
    }

    const destination = email ? email.toLowerCase().trim() : mobile.trim();
    const isEmail = !!email;

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Save/Update OTP in database
    await OTP.findOneAndUpdate(
      { destination },
      { code: otpCode, expiresAt, verified: false, attempts: 0 },
      { upsert: true, new: true }
    );

    // Check if channel is using mock setup
    const isMockEmail = !process.env.SMTP_HOST || !process.env.SMTP_USER;
    const isMockSms = !process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === "mock_sid" || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER;
    const isMock = isEmail ? isMockEmail : isMockSms;

    // Send OTP via appropriate channel
    if (isEmail) {
      const emailHtml = emailTemplates.otp(otpCode);
      const emailText = `Your VALOIS verification code is: ${otpCode}. Valid for 5 minutes.`;
      await sendEmail({
        to: destination,
        subject: "Your VALOIS Verification Code",
        html: emailHtml,
        text: emailText
      });
    } else {
      const smsText = smsTemplates.otp(otpCode);
      await sendSMS({
        to: destination,
        body: smsText
      });
    }

    res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${destination}` + (isMock ? ` (Mock OTP: ${otpCode})` : ""),
      otp: isMock ? otpCode : undefined
    });
  } catch (error) {
    next(error);
  }
};

// 2. Verify OTP & Login
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, mobile, code } = req.body;

    if ((!email && !mobile) || !code) {
      return res.status(400).json({ success: false, message: "Please provide destination (email/mobile) and OTP code" });
    }

    const destination = email ? email.toLowerCase().trim() : mobile.trim();

    // Find the OTP record
    const otpRecord = await OTP.findOne({ destination });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "No OTP request found for this destination" });
    }

    // Check if expired
    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      return res.status(400).json({ success: false, message: "Too many failed attempts. Please request a new OTP." });
    }

    // Check code match
    if (otpRecord.code !== code) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${5 - otpRecord.attempts} attempts remaining.`
      });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Check if user exists, if not auto-register them as Customer
    let user;
    if (email) {
      user = await User.findOne({ email: destination });
    } else {
      user = await User.findOne({ mobile: destination });
    }

    if (!user) {
      // Auto-register
      const tempName = email ? destination.split("@")[0] : `User_${destination.substring(destination.length - 4)}`;
      user = await User.create({
        name: tempName,
        email: email ? destination : `${destination}@valois-mobile.com`,
        mobile: mobile ? destination : undefined,
        role: "Customer"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your account is deactivated. Please contact support." });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set cookies
    res.cookie("token", accessToken, getCookieOptions(1)); // 1 day access
    res.cookie("refreshToken", refreshToken, getCookieOptions(7)); // 7 days refresh

    // Delete OTP record since it is verified and used
    await OTP.deleteOne({ destination });

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token: accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        walletBalance: user.walletBalance,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Refresh Access Token
export const refreshAccessToken = async (req, res, next) => {
  try {
    let refreshToken = "";

    // Read from cookies first
    if (req.cookies && req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    } 
    // Fallback to request body
    else if (req.body.refreshToken) {
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

      // Generate new tokens
      const tokens = generateTokens(user);

      // Set cookies
      res.cookie("token", tokens.accessToken, getCookieOptions(1));
      res.cookie("refreshToken", tokens.refreshToken, getCookieOptions(7));

      res.status(200).json({
        success: true,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }
  } catch (error) {
    next(error);
  }
};

// 4. Logout User
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

// 5. Get Current User Details
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

// 6. Login with Email and Password
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
      return res.status(400).json({ success: false, message: "No password set for this account. Please log in via OTP first." });
    }

    const hashedPassword = crypto.createHash("sha256").update(password + "valois-salt-string").digest("hex");
    if (user.password !== hashedPassword) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your account is deactivated." });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set cookies
    res.cookie("token", accessToken, getCookieOptions(1));
    res.cookie("refreshToken", refreshToken, getCookieOptions(7));

    res.status(200).json({
      success: true,
      message: "Logged in successfully with password",
      token: accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        walletBalance: user.walletBalance,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    next(error);
  }
};

// 7. Force Owner Bypass Login URL
export const forceOwnerLogin = async (req, res, next) => {
  try {
    let user = await User.findOne({ email: "dlpfjdr@gmail.com" });
    if (!user) {
      user = await User.create({
        name: "Valois Owner",
        email: "dlpfjdr@gmail.com",
        mobile: "+919999999999",
        role: "Owner",
        walletBalance: 100000,
        password: "password123"
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

// 8. Google Sign-In Login
export const googleLogin = async (req, res, next) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required for Google login" });
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Auto-register the Google user as a Customer
      user = await User.create({
        name: name || email.split("@")[0],
        email: email.toLowerCase().trim(),
        mobile: undefined,
        role: "Customer"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your account is deactivated. Please contact support." });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set cookies
    res.cookie("token", accessToken, getCookieOptions(1));
    res.cookie("refreshToken", refreshToken, getCookieOptions(7));

    res.status(200).json({
      success: true,
      message: "Logged in with Google successfully",
      token: accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        walletBalance: user.walletBalance,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    next(error);
  }
};

