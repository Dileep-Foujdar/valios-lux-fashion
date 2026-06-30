// Global Error Handler Middleware
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  console.error("> Error Details:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });

  // Handle Mongoose Bad ObjectId (Cast Error)
  if (err.name === "CastError") {
    message = `Resource not found. Invalid field: ${err.path}`;
    statusCode = 400;
  }

  // Handle Mongoose Validation Error
  if (err.name === "ValidationError") {
    message = Object.values(err.errors).map((value) => value.message).join(", ");
    statusCode = 400;
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue).join(", ");
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

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};
