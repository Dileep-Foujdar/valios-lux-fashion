import mongoose from "mongoose";
import {
  DEFAULT_PRODUCT_VISIBILITY,
  DEFAULT_BADGE_LIBRARY
} from "../utils/productDisplay.js";

const BadgeLibrarySchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  color: { type: String, default: "#111111" },
  icon: { type: String, default: "" },
  priority: { type: Number, default: 100 },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const WebsiteSettingsSchema = new mongoose.Schema({
  theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
  seo: {
    title: { type: String, default: "Premium Fashion E-Commerce" },
    metaDescription: { type: String, default: "Discover premium fashion clothing, shoes, watches, and accessories." },
    ogImage: { type: String, default: "" },
    keywords: { type: [String], default: ["fashion", "e-commerce", "clothing", "premium"] }
  },
  smtp: {
    host: { type: String, default: "" },
    port: { type: Number, default: 587 },
    user: { type: String, default: "" },
    pass: { type: String, default: "" },
    from: { type: String, default: "" }
  },
  sms: {
    twilioSid: { type: String, default: "" },
    token: { type: String, default: "" },
    fromNum: { type: String, default: "" }
  },
  paymentConfig: {
    stripeSecretKey: { type: String, default: "" },
    razorpayKeyId: { type: String, default: "" },
    razorpayKeySecret: { type: String, default: "" }
  },
  bannerImages: [{ type: String }],
  heroSlider: [{
    image: { type: String, required: true },
    title: { type: String },
    subtitle: { type: String },
    link: { type: String }
  }],
  footerDetails: {
    contactEmail: { type: String, default: "support@fashionstore.com" },
    contactPhone: { type: String, default: "+91 9999999999" },
    address: { type: String, default: "123 Fashion Street, Mumbai, India" },
    facebook: { type: String, default: "" },
    instagram: { type: String, default: "" },
    twitter: { type: String, default: "" }
  },
  deliveryCharges: {
    minAmountForFreeDelivery: { type: Number, default: 999 },
    defaultCharge: { type: Number, default: 99 }
  },
  taxPercentage: {
    gst: { type: Number, default: 18 }
  },
  // Global defaults for storefront product field/button visibility
  productVisibility: {
    type: Map,
    of: Boolean,
    default: () => ({ ...DEFAULT_PRODUCT_VISIBILITY })
  },
  badgeLibrary: {
    type: [BadgeLibrarySchema],
    default: () => DEFAULT_BADGE_LIBRARY.map((b) => ({ ...b }))
  },
  storefront: {
    showProductCounts: { type: Boolean, default: false },
    showCategoryCounts: { type: Boolean, default: false },
    showBrandCounts: { type: Boolean, default: false }
  }
}, { timestamps: true });

WebsiteSettingsSchema.methods.getProductVisibilityObject = function getProductVisibilityObject() {
  const map = this.productVisibility;
  if (!map) return { ...DEFAULT_PRODUCT_VISIBILITY };
  if (map instanceof Map) return { ...DEFAULT_PRODUCT_VISIBILITY, ...Object.fromEntries(map) };
  return { ...DEFAULT_PRODUCT_VISIBILITY, ...map };
};

export default mongoose.models.WebsiteSettings || mongoose.model("WebsiteSettings", WebsiteSettingsSchema);
