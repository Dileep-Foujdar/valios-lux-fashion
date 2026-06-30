import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return;
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`> MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`> MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
