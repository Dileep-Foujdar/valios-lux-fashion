import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  mrp: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0 }, // Discount in percentage
  brand: { type: String, required: true, trim: true },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  specifications: [{
    name: { type: String, required: true },
    value: { type: String, required: true }
  }],
  colors: [String],
  sizes: [String],
  images: [String], // Array of image URLs
  videoUrl: { type: String, default: "" }, // Product walk-around video URL
  view360Images: [String], // Array of URLs for 360 degree display
  stock: { type: Number, required: true, default: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  subcategory: { type: String, required: true },
  tags: [String],
  featured: { type: Boolean, default: false },
  trending: { type: Boolean, default: false },
  bestSeller: { type: Boolean, default: false },
  latest: { type: Boolean, default: false },
  newArrival: { type: Boolean, default: false },
  offerProduct: { type: Boolean, default: false }
}, { timestamps: true });

// Pre-save middleware to calculate discount percentage based on mrp and salePrice
ProductSchema.pre("save", function(next) {
  if (this.mrp > 0 && this.salePrice > 0) {
    this.discount = Math.round(((this.mrp - this.salePrice) / this.mrp) * 100);
  }
  next();
});

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
