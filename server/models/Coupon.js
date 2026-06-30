import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ["Percentage", "Fixed"], required: true },
  value: { type: Number, required: true, min: 0 },
  minPurchase: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, default: 0 }, // Max discount cap for percentage discount
  expiryDate: { type: Date, required: true },
  usageLimit: { type: Number, default: null }, // Null means unlimited
  usedCount: { type: Number, default: 0 },
  usersUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Pre-save to capitalize code
CouponSchema.pre("save", function(next) {
  this.code = this.code.toUpperCase();
  next();
});

export default mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);
