import mongoose from "mongoose";

const ColorVariantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, default: "#000000", trim: true },
  images: [{ type: String }]
}, { _id: true });

const SeoSchema = new mongoose.Schema({
  metaTitle: { type: String, default: "", trim: true },
  metaDescription: { type: String, default: "", trim: true },
  keywords: [{ type: String, trim: true }]
}, { _id: false });

const ProductBadgeSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  color: { type: String, default: "#111111" },
  icon: { type: String, default: "" },
  priority: { type: Number, default: 100 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  enabled: { type: Boolean, default: true }
}, { _id: true });

// Booleans without defaults so undefined = inherit global visibility
const DisplayConfigSchema = new mongoose.Schema({
  reviews: Boolean,
  ratings: Boolean,
  soldCount: Boolean,
  stockStatus: Boolean,
  offerPrice: Boolean,
  discount: Boolean,
  originalPrice: Boolean,
  brand: Boolean,
  category: Boolean,
  sku: Boolean,
  colors: Boolean,
  sizes: Boolean,
  variants: Boolean,
  wishlist: Boolean,
  compare: Boolean,
  quickView: Boolean,
  buyNow: Boolean,
  addToCart: Boolean,
  specifications: Boolean,
  warranty: Boolean,
  shortDescription: Boolean,
  tags: Boolean
}, { _id: false });

const slugify = (text = "") =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  shortDescription: { type: String, default: "", trim: true },
  description: { type: String, required: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  mrp: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0 },
  taxPercent: { type: Number, default: 0, min: 0 },
  shippingCost: { type: Number, default: 0, min: 0 },
  brand: { type: String, required: true, trim: true },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  specifications: [{
    name: { type: String, required: true },
    value: { type: String, required: true }
  }],
  colors: [String],
  colorVariants: [ColorVariantSchema],
  sizes: [String],
  images: [String],
  videoUrl: { type: String, default: "" },
  view360Images: [String],
  stock: { type: Number, required: true, default: 0 },
  lowStockThreshold: { type: Number, default: 15, min: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  subcategory: { type: String, required: true },
  tags: [String],
  status: {
    type: String,
    enum: ["draft", "published"],
    default: "published"
  },
  seo: { type: SeoSchema, default: () => ({}) },
  featured: { type: Boolean, default: false },
  trending: { type: Boolean, default: false },
  bestSeller: { type: Boolean, default: false },
  latest: { type: Boolean, default: false },
  newArrival: { type: Boolean, default: false },
  offerProduct: { type: Boolean, default: false },
  // Admin-assigned merchandising badges
  badges: { type: [ProductBadgeSchema], default: [] },
  // Per-product visibility overrides (undefined keys inherit global settings)
  displayConfig: { type: DisplayConfigSchema, default: () => ({}) },
  warranty: { type: String, default: "", trim: true },
  materials: [{ type: String, trim: true }],
  // Sales analytics counters
  soldCount: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  wishlistCount: { type: Number, default: 0 },
  cartCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  orderCount: { type: Number, default: 0 },
  returnCount: { type: Number, default: 0 },
  refundCount: { type: Number, default: 0 }
}, { timestamps: true });

ProductSchema.virtual("stockStatus").get(function stockStatus() {
  const stock = Number(this.stock) || 0;
  const threshold = Number(this.lowStockThreshold) || 15;
  if (stock <= 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
});

ProductSchema.set("toJSON", { virtuals: true });
ProductSchema.set("toObject", { virtuals: true });

ProductSchema.pre("save", async function preSave(next) {
  try {
    if (this.mrp > 0 && this.salePrice >= 0) {
      this.discount = Math.round(((this.mrp - this.salePrice) / this.mrp) * 100);
      if (this.discount < 0) this.discount = 0;
    }

    if (!this.slug && this.title) {
      let base = slugify(this.title) || `product-${Date.now()}`;
      let candidate = base;
      let i = 1;
      // Ensure unique slug
      while (await this.constructor.findOne({ slug: candidate, _id: { $ne: this._id } })) {
        candidate = `${base}-${i++}`;
      }
      this.slug = candidate;
    }

    if (Array.isArray(this.colorVariants) && this.colorVariants.length > 0) {
      this.colors = this.colorVariants.map((v) => v.name).filter(Boolean);
    }

    // Keep legacy filter flags in sync with assigned badges
    if (Array.isArray(this.badges) && this.badges.length > 0) {
      const now = new Date();
      const activeKeys = new Set(
        this.badges
          .filter((b) => {
            if (b.enabled === false) return false;
            if (b.startDate && new Date(b.startDate) > now) return false;
            if (b.endDate && new Date(b.endDate) < now) return false;
            return true;
          })
          .map((b) => String(b.key || "").toLowerCase())
      );
      this.newArrival = activeKeys.has("new") || activeKeys.has("new_arrival");
      this.latest = this.newArrival;
      this.trending = activeKeys.has("trending");
      this.bestSeller = activeKeys.has("best_seller") || activeKeys.has("bestseller");
      this.featured = activeKeys.has("featured");
      this.offerProduct = activeKeys.has("sale") || activeKeys.has("hot_deal") || activeKeys.has("flash_sale");
    }

    next();
  } catch (err) {
    next(err);
  }
});

ProductSchema.pre("findOneAndUpdate", function preUpdate(next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;

  if ($set.mrp != null && $set.salePrice != null && Number($set.mrp) > 0) {
    $set.discount = Math.round(((Number($set.mrp) - Number($set.salePrice)) / Number($set.mrp)) * 100);
    if ($set.discount < 0) $set.discount = 0;
  }

  if (Array.isArray($set.colorVariants) && $set.colorVariants.length > 0) {
    $set.colors = $set.colorVariants.map((v) => v.name).filter(Boolean);
  }

  if (update.$set) update.$set = $set;
  next();
});

export const getStockStatus = (product) => {
  const stock = Number(product?.stock) || 0;
  const threshold = Number(product?.lowStockThreshold) || 15;
  if (stock <= 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
};

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
