import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Null means broadcast to all users
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ["Order", "Promotion", "System"],
    default: "System"
  },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // For broadcast notifications
  read: { type: Boolean, default: false }, // For user-specific notifications
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
