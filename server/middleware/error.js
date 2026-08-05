// Global Error Handler Middleware
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Handle Mongoose Bad ObjectId (Cast Error)
  if (err.name === "CastError") {
    message = `Resource not found. Invalid field: ${err.path}`;
    statusCode = 400;
  }

  // Handle Mongoose Validation Error
  if (err.name === "ValidationError") {
    message = Object.values(err.errors ? err.errors : {}).map((value) => value.message).join(", ") || message;
    statusCode = 400;
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const fields = err.keyValue ? Object.keys(err.keyValue).join(", ") : "field";
    message = `Duplicate value entered for field(s): ${fields}`;
    statusCode = 400;
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    message = "Invalid token, please log in again.";
    statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    message = "Token has expired, please log in again.";
    statusCode = 401;
  }

  // Clean, concise 1-line logging without node_modules stack trace clutter
  if (statusCode >= 500) {
    console.error(`[SERVER ERROR ${statusCode}] ${req.method} ${req.originalUrl}:`, err.message);
  } else {
    console.warn(`[API NOTICE ${statusCode}] ${req.method} ${req.originalUrl}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};
