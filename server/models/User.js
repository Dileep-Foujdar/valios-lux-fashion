import mongoose from "mongoose";
import crypto from "crypto";

const AddressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, default: "India" },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

const CartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },
  color: { type: String },
  size: { type: String }
}, { _id: true });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, required: true, unique: true, trim: true },
  role: {
    type: String,
    enum: ["Customer", "Delivery Partner", "Admin", "Owner", "Super Admin"],
    default: "Customer"
  },
  walletBalance: { type: Number, default: 0 },
  referralCode: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  addresses: [AddressSchema],
  cart: [CartItemSchema],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  isActive: { type: Boolean, default: true },
  password: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

// Pre-save to generate referral code and hash password if not present
UserSchema.pre("save", function(next) {
  if (!this.referralCode) {
    this.referralCode = "FASHION-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  if (this.isModified("password") && this.password) {
    this.password = crypto.createHash("sha256").update(this.password + "valois-salt-string").digest("hex");
  }
  
  next();
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
