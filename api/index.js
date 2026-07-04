import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import connectDB from "../server/config/db.js";
import { seedDatabase } from "../server/utils/seed.js";
import apiRouter from "../server/routes/api.js";
import { errorHandler } from "../server/middleware/error.js";
import {
  configureHelmet,
  configureCors,
  sanitizeMongoQueries,
  sanitizeXSS
} from "../server/middleware/security.js";

const app = express();

// Connect to MongoDB and seed database
let dbConnected = false;
const connectAndSeed = async () => {
  if (!dbConnected) {
    await connectDB();
    await seedDatabase();
    dbConnected = true;
  }
};

// Middleware to ensure database connection is established
app.use(async (req, res, next) => {
  try {
    await connectAndSeed();
    next();
  } catch (error) {
    console.error("Database connection error in Vercel Serverless Function:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Mock Socket.io connection instance to prevent server crashes in routes/controllers
app.use((req, res, next) => {
  req.io = {
    emit: () => {},
    to: () => ({
      emit: () => {}
    })
  };
  next();
});

// Apply Security Middlewares
app.use(configureHelmet());
app.use(configureCors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());
app.use(sanitizeMongoQueries);
app.use(sanitizeXSS);

// Route API endpoints
app.use("/api", apiRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
