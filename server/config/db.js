import dns from "dns";
import mongoose from "mongoose";

// Configure Node.js DNS resolver to use reliable public DNS servers (Google/Cloudflare)
// to fix querySrv ECONNREFUSED issues with MongoDB Atlas on Windows/local networks
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (err) {
  console.warn("> Note: Could not override default DNS servers:", err.message);
}

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const primaryUri = process.env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(primaryUri);
    console.log(`> MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`> Primary MongoDB connection failed (${error.message}). Attempting fallback options...`);

    // Try local MongoDB
    try {
      const localUri = "mongodb://127.0.0.1:27017/ecommerce-web";
      const conn = await mongoose.connect(localUri);
      console.log(`> Local MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (localErr) {
      // Try MongoMemoryServer
      try {
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        const conn = await mongoose.connect(mongoUri);
        console.log(`> In-Memory MongoDB Started & Connected: ${mongoUri}`);
        return conn;
      } catch (memErr) {
        console.error(`> MongoDB Connection Error: ${error.message}`);
        console.error(`> Please update MONGODB_URI in .env with valid credentials or start local MongoDB.`);
        process.exit(1);
      }
    }
  }
};

export default connectDB;
