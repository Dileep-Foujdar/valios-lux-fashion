import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import next from "next";

import connectDB from "./server/config/db.js";
import { seedDatabase } from "./server/utils/seed.js";
import apiRouter from "./server/routes/api.js";
import { errorHandler } from "./server/middleware/error.js";
import {
  configureHelmet,
  configureCors,
  sanitizeMongoQueries,
  sanitizeXSS
} from "./server/middleware/security.js";

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

const port = parseInt(process.env.PORT || "5000", 10);

// Connect to MongoDB
connectDB().then(() => {
  // Trigger Database Auto-Seeder if collections are empty
  seedDatabase();
});

nextApp.prepare().then(() => {
  const app = express();
  const server = http.createServer(app);
  
  // Initialize Socket.io
  const io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || "http://localhost:5000",
        "http://localhost:3000",
        "http://localhost:5000"
      ],
      credentials: true
    }
  });

  // Attach socket.io instance to request so controllers can emit events
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  // Apply Security Middlewares
  app.use(configureHelmet());
  app.use(configureCors());
  app.use(express.json({ limit: "15mb" })); // Increase limit for base64 uploads
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));
  app.use(cookieParser());
  app.use(sanitizeMongoQueries);
  app.use(sanitizeXSS);

  // Serve uploads directory publicly
  app.use("/uploads", express.static("public/uploads"));

  // Backend API Routing
  app.use("/api", apiRouter);

  // Next.js Frontend Page Routing (should be loaded after API routes)
  app.all("*", (req, res) => {
    return nextHandler(req, res);
  });

  // Global Error Handler
  app.use(errorHandler);

  // Socket.io Connection Logic
  io.on("connection", (socket) => {
    console.log(`> Socket connected: ${socket.id}`);

    // Join room based on user role or ID
    socket.on("join", (data) => {
      const { userId, role } = data;
      if (userId) {
        socket.join(`user_${userId}`);
      }
      if (role === "Admin" || role === "Owner" || role === "Super Admin") {
        socket.join("admin_room");
      }
      if (role === "Delivery Partner") {
        socket.join("delivery_room");
      }
      console.log(`> Socket ${socket.id} joined rooms: user_${userId || 'guest'}, role_${role || 'guest'}`);
    });

    // Realtime chat rooms for orders
    socket.on("joinOrderChat", (data) => {
      const { orderId } = data;
      if (orderId) {
        socket.join(`order_chat_${orderId}`);
        console.log(`> Socket ${socket.id} joined order chat room: order_chat_${orderId}`);
      }
    });

    socket.on("leaveOrderChat", (data) => {
      const { orderId } = data;
      if (orderId) {
        socket.leave(`order_chat_${orderId}`);
        console.log(`> Socket ${socket.id} left order chat room: order_chat_${orderId}`);
      }
    });

    // Realtime Delivery Partner Location Tracking
    socket.on("updateLocation", (data) => {
      const { orderId, latitude, longitude } = data;
      // Broadcast location to the specific customer tracking this order
      io.to(`order_tracking_${orderId}`).emit("locationUpdated", { latitude, longitude });
    });

    socket.on("joinOrderTracking", (data) => {
      const { orderId } = data;
      socket.join(`order_tracking_${orderId}`);
      console.log(`> Socket ${socket.id} started tracking order: ${orderId}`);
    });

    socket.on("disconnect", () => {
      console.log(`> Socket disconnected: ${socket.id}`);
    });
  });

  // Start unified server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Server ready on http://localhost:${port} in ${dev ? "development" : "production"} mode`);
  });
}).catch((error) => {
  console.error("> Next.js preparation error:", error);
  process.exit(1);
});
