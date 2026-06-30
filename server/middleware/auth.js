import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verify JWT Access Token
export const isAuthenticated = async (req, res, next) => {
  try {
    let token = "";

    // Read from cookies first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } 
    // Fallback to Auth Header
    else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Please log in to access this resource" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ success: false, message: "User not found or deleted" });
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, message: "Your account is deactivated" });
      }

      req.user = user;
      next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, code: "TOKEN_EXPIRED", message: "Token has expired" });
      }
      return res.status(401).json({ success: false, message: "Invalid token, login again" });
    }
  } catch (error) {
    next(error);
  }
};

// Check role permissions
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user ? req.user.role : "Guest"}) is not allowed to access this resource`
      });
    }
    next();
  };
};
