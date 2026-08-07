import CatalogItem from "../models/CatalogItem.js";
import Category from "../models/Category.js";

const slugify = (text = "") =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const VALID_TYPES = ["brand", "color", "size", "material", "tag", "variant"];

const normalizeSubcategories = (list = []) =>
  (list || []).map((item, index) => {
    if (typeof item === "string") {
      return { name: item.trim(), enabled: true, order: index };
    }
    return {
      name: String(item?.name || "").trim(),
      enabled: item?.enabled !== false,
      order: Number(item?.order) || index
    };
  }).filter((s) => s.name);

export const listCatalogItems = async (req, res, next) => {
  try {
    const { type, includeDisabled } = req.query;
    const filter = {};
    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ success: false, message: "Invalid catalog type" });
      }
      filter.type = type;
    }
    if (includeDisabled !== "true") filter.enabled = true;

    const items = await CatalogItem.find(filter).sort({ order: 1, name: 1 });
    res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

export const createCatalogItem = async (req, res, next) => {
  try {
    const { type, name, code, description, enabled = true, order = 0, meta = {} } = req.body;
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid catalog type" });
    }
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const slug = slugify(name);
    const exists = await CatalogItem.findOne({ type, slug });
    if (exists) {
      return res.status(400).json({ success: false, message: "Item already exists" });
    }

    const item = await CatalogItem.create({
      type,
      name: name.trim(),
      slug,
      code: code || "",
      description: description || "",
      enabled: enabled !== false,
      order: Number(order) || 0,
      meta
    });

    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

export const updateCatalogItem = async (req, res, next) => {
  try {
    const item = await CatalogItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Catalog item not found" });
    }

    const { name, code, description, enabled, order, meta } = req.body;
    if (name !== undefined) {
      item.name = name.trim();
      item.slug = slugify(name);
    }
    if (code !== undefined) item.code = code;
    if (description !== undefined) item.description = description;
    if (enabled !== undefined) item.enabled = Boolean(enabled);
    if (order !== undefined) item.order = Number(order) || 0;
    if (meta !== undefined) item.meta = meta;

    await item.save();
    res.status(200).json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

export const deleteCatalogItem = async (req, res, next) => {
  try {
    const item = await CatalogItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Catalog item not found" });
    }
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    next(error);
  }
};

export const reorderCatalogItems = async (req, res, next) => {
  try {
    const { type, orderedIds } = req.body;
    if (!VALID_TYPES.includes(type) || !Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: "type and orderedIds required" });
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        CatalogItem.findByIdAndUpdate(id, { order: index })
      )
    );

    const items = await CatalogItem.find({ type }).sort({ order: 1, name: 1 });
    res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

export const listCategoriesAdmin = async (req, res, next) => {
  try {
    const { includeDisabled } = req.query;
    const filter = includeDisabled === "true" ? {} : { enabled: { $ne: false } };
    const categories = await Category.find(filter).sort({ order: 1, name: 1 });
    const payload = categories.map((c) => {
      const obj = c.toObject();
      obj.subcategories = normalizeSubcategories(c.subcategories);
      return obj;
    });
    res.status(200).json({ success: true, categories: payload });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, image, subcategories = [], enabled = true, order = 0 } = req.body;
    if (!name?.trim() || !image?.trim()) {
      return res.status(400).json({ success: false, message: "Name and image are required" });
    }

    const slug = slugify(name);
    const exists = await Category.findOne({ $or: [{ slug }, { name: name.trim() }] });
    if (exists) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const category = await Category.create({
      name: name.trim(),
      slug,
      image: image.trim(),
      enabled: enabled !== false,
      order: Number(order) || 0,
      subcategories: normalizeSubcategories(subcategories)
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const { name, image, subcategories, enabled, order } = req.body;
    if (name !== undefined) {
      category.name = name.trim();
      category.slug = slugify(name);
    }
    if (image !== undefined) category.image = image;
    if (subcategories !== undefined) {
      category.subcategories = normalizeSubcategories(subcategories);
    }
    if (enabled !== undefined) category.enabled = Boolean(enabled);
    if (order !== undefined) category.order = Number(order) || 0;

    await category.save();
    const obj = category.toObject();
    obj.subcategories = normalizeSubcategories(category.subcategories);
    res.status(200).json({ success: true, category: obj });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};

export const reorderCategories = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: "orderedIds required" });
    }
    await Promise.all(
      orderedIds.map((id, index) => Category.findByIdAndUpdate(id, { order: index }))
    );
    const categories = await Category.find().sort({ order: 1, name: 1 });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};
