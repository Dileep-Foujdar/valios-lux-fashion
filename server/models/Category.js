import mongoose from "mongoose";

const SubcategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { _id: false });

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  image: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  // Supports legacy string[] and new object[] — normalized in controllers
  subcategories: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { timestamps: true });

CategorySchema.methods.getSubcategories = function getSubcategories({ enabledOnly = false } = {}) {
  const list = (this.subcategories || []).map((item, index) => {
    if (typeof item === "string") {
      return { name: item, enabled: true, order: index };
    }
    return {
      name: item?.name || "",
      enabled: item?.enabled !== false,
      order: Number(item?.order) || index
    };
  }).filter((s) => s.name);

  const sorted = list.sort((a, b) => a.order - b.order);
  return enabledOnly ? sorted.filter((s) => s.enabled) : sorted;
};

export default mongoose.models.Category || mongoose.model("Category", CategorySchema);
