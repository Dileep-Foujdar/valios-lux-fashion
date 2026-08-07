import mongoose from "mongoose";

const PendingLocationSchema = new mongoose.Schema({
  permission: {
    type: String,
    enum: ["granted", "denied", "prompt", "unavailable", "manual"],
    default: "prompt"
  },
  latitude: { type: Number },
  longitude: { type: Number },
  accuracy: { type: Number },
  city: { type: String, trim: true },
  address: { type: String, trim: true }
}, { _id: false });

const PendingRegistrationSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  mobile: { type: String, trim: true },
  location: { type: PendingLocationSchema }
}, { _id: false });

const OTPSchema = new mongoose.Schema({
  destination: { type: String, required: true, index: true }, // email
  purpose: {
    type: String,
    enum: ["login", "register", "delivery_login", "delivery_register"],
    default: "login"
  },
  code: { type: String, required: true }, // stored hashed when purpose is delivery_*
  codeHash: { type: String, default: "" },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  isUsed: { type: Boolean, default: false },
  attempts: { type: Number, default: 0, max: 5 },
  pendingRegistration: { type: PendingRegistrationSchema }
}, { timestamps: true });

// TTL index to automatically delete expired OTPs from the database
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.OTP || mongoose.model("OTP", OTPSchema);
