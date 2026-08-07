import mongoose from "mongoose";

const CatalogItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["brand", "color", "size", "material", "tag", "variant"],
    required: true,
    index: true
  },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  code: { type: String, default: "", trim: true }, // hex for colors
  description: { type: String, default: "", trim: true },
  enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

CatalogItemSchema.index({ type: 1, slug: 1 }, { unique: true });
CatalogItemSchema.index({ type: 1, order: 1 });

export default mongoose.models.CatalogItem || mongoose.model("CatalogItem", CatalogItemSchema);
