import mongoose from "mongoose";

const VerificationStatus = {
  type: String,
  enum: ["pending", "under_review", "verified", "rejected"],
  default: "pending"
};

const DeliveryPartnerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  fullName: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date },
  age: { type: Number, min: 18, max: 80 },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  emailVerified: { type: Boolean, default: false },

  currentAddress: {
    houseNo: String,
    street: String,
    landmark: String,
    city: String,
    state: String,
    country: { type: String, default: "India" },
    zipCode: String
  },

  location: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    updatedAt: Date,
    trackingConsent: { type: Boolean, default: false }
  },

  // Encrypted at rest
  aadhaarEncrypted: { type: String, default: "" },
  aadhaarLast4: { type: String, default: "" },
  aadhaarDocumentUrl: { type: String, default: "" },
  aadhaarVerification: VerificationStatus,

  selfieUrl: { type: String, default: "" },
  selfieVerification: VerificationStatus,
  selfieCapturedAt: { type: Date },

  vehicleNumber: { type: String, trim: true, uppercase: true },
  vehicleDetails: { type: String, default: "", trim: true },

  bank: {
    accountHolderName: { type: String, default: "" },
    accountNumberEncrypted: { type: String, default: "" },
    accountLast4: { type: String, default: "" },
    ifsc: { type: String, default: "", uppercase: true },
    bankName: { type: String, default: "" },
    verification: VerificationStatus
  },

  profilePhoto: { type: String, default: "" },
  approvalStatus: {
    type: String,
    enum: ["draft", "pending", "approved", "rejected", "suspended"],
    default: "draft",
    index: true
  },
  rejectionReason: { type: String, default: "" },
  isAvailable: { type: Boolean, default: true },
  isOnline: { type: Boolean, default: false },
  adminNotes: { type: String, default: "" },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

DeliveryPartnerSchema.index({ approvalStatus: 1, isAvailable: 1 });
DeliveryPartnerSchema.index({ email: 1 });
DeliveryPartnerSchema.index({ mobile: 1 });

export default mongoose.models.DeliveryPartner || mongoose.model("DeliveryPartner", DeliveryPartnerSchema);
