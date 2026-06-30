import mongoose from "mongoose";

const OTPSchema = new mongoose.Schema({
  destination: { type: String, required: true, index: true }, // email or mobile number
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  attempts: { type: Number, default: 0, max: 5 } // Max 5 verification attempts
}, { timestamps: true });

// TTL index to automatically delete expired OTPs from the database
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.OTP || mongoose.model("OTP", OTPSchema);
