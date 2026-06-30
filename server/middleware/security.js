import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

// Rate limiter for general APIs
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes."
  }
});

// Rate limiter for OTP requests (strict)
export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 OTP requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please wait 5 minutes before trying again."
  }
});

// CORS Config
export const configureCors = () => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5000",
    "http://localhost:3000",
    "http://localhost:5000"
  ];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, true); // Allow for dev ease, or customize as needed
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  });
};

// Helmet Configuration
export const configureHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://checkout.razorpay.com", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://res.cloudinary.com", "https://placehold.co", "https://*.stripe.com"],
        connectSrc: ["'self'", "https://api.cloudinary.com", "https://api.stripe.com", "https://checkout.razorpay.com", "wss://*", "ws://*"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https://assets.mixkit.co", "blob:", "data:"],
        frameSrc: ["'self'", "https://checkout.razorpay.com", "https://js.stripe.com", "https://hooks.stripe.com"]
      }
    },
    crossOriginEmbedderPolicy: false
  });
};

// Custom Input Sanitization to prevent MongoDB Injection ($ and . prefix)
export const sanitizeMongoQueries = (req, res, next) => {
  const clean = (obj) => {
    if (obj && typeof obj === "object") {
      Object.keys(obj).forEach((key) => {
        if (key.startsWith("$") || key.includes(".")) {
          delete obj[key];
        } else {
          clean(obj[key]);
        }
      });
    }
  };
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};

// Custom XSS Sanitizer
export const sanitizeXSS = (req, res, next) => {
  const cleanString = (str) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  };

  const sanitizeValue = (val) => {
    if (typeof val === "string") {
      return cleanString(val);
    }
    if (val && typeof val === "object") {
      Object.keys(val).forEach((k) => {
        val[k] = sanitizeValue(val[k]);
      });
    }
    return val;
  };

  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};
