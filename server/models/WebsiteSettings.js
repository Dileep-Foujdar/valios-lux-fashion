import mongoose from "mongoose";

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
    gst: { type: Number, default: 18 } // Standard 18% GST for apparel
  }
}, { timestamps: true });

export default mongoose.models.WebsiteSettings || mongoose.model("WebsiteSettings", WebsiteSettingsSchema);
