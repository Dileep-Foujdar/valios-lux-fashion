import mongoose from "mongoose";
import Product, { getStockStatus } from "../models/Product.js";
import Category from "../models/Category.js";
import CatalogItem from "../models/CatalogItem.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { parseBool, resolveProductSort } from "../utils/queryHelpers.js";

const slugify = (text = "") =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const normalizeImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images.map((img) => String(img).trim()).filter(Boolean);
};

const normalizeColorVariants = (variants) => {
  if (!Array.isArray(variants)) return [];
  return variants
    .map((v) => ({
      name: String(v.name || "").trim(),
      code: String(v.code || "#000000").trim(),
      images: normalizeImages(v.images)
    }))
    .filter((v) => v.name);
};

const validateGalleries = ({ images, colorVariants }) => {
  const imgs = normalizeImages(images);
  const variants = normalizeColorVariants(colorVariants);

  if (variants.length > 0) {
    for (const v of variants) {
      if (v.images.length < 3) {
        return `Color "${v.name}" needs at least 3 images`;
      }
    }
    return null;
  }

  if (imgs.length < 3) {
    return "At least 3 product images are required";
  }
  return null;
};

const buildProductQuery = async (reqQuery) => {
  const {
    search,
    category,
    subcategory,
    brand,
    minPrice,
    maxPrice,
    color,
    size,
    rating,
    featured,
    trending,
    bestSeller,
    latest,
    newArrival,
    offerProduct,
    status,
    stockStatus,
    publishedOnly,
    hasDiscount,
    minDiscount
  } = reqQuery;

  const queryObj = {};

  if (search) {
    queryObj.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
      { tags: { $in: [new RegExp(search, "i")] } }
    ];
  }

  if (category) {
    const decodedCategory = decodeURIComponent(category).trim();
    const escaped = decodedCategory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    let categoryDoc = null;
    if (mongoose.Types.ObjectId.isValid(category)) {
      categoryDoc = await Category.findById(category);
    }

    if (!categoryDoc) {
      categoryDoc = await Category.findOne({
        $or: [
          { slug: category.toLowerCase() },
          { slug: decodedCategory.toLowerCase() },
          { name: new RegExp(`^${escaped}$`, "i") },
          { name: new RegExp(escaped, "i") }
        ]
      });
    }

    if (!categoryDoc) {
      categoryDoc = await Category.findOne({
        subcategories: { $in: [new RegExp(escaped, "i")] }
      });
    }

    queryObj.category = categoryDoc ? categoryDoc._id : new mongoose.Types.ObjectId();
  }

  if (subcategory) queryObj.subcategory = subcategory;

  if (brand) {
    const brandArray = brand.split(",");
    queryObj.brand = { $in: brandArray.map((b) => new RegExp(`^${b.trim()}$`, "i")) };
  }

  if (minPrice || maxPrice) {
    queryObj.salePrice = {};
    if (minPrice) queryObj.salePrice.$gte = Number(minPrice);
    if (maxPrice) queryObj.salePrice.$lte = Number(maxPrice);
  }

  if (color) {
    const colors = color.split(",").map((c) => c.trim());
    queryObj.colors = { $in: colors.map((c) => new RegExp(`^${c}$`, "i")) };
  }

  if (size) {
    const sizes = size.split(",").map((s) => s.trim());
    queryObj.sizes = { $in: sizes.map((s) => new RegExp(`^${s}$`, "i")) };
  }

  if (rating) queryObj.rating = { $gte: Number(rating) };

  // Boolean flags — accept true / "true" / 1 / "yes"
  if (parseBool(featured)) queryObj.featured = true;
  if (parseBool(trending)) queryObj.trending = true;
  if (parseBool(bestSeller)) queryObj.bestSeller = true;
  if (parseBool(offerProduct)) queryObj.offerProduct = true;

  // newArrival OR latest → either flag true
  if (parseBool(newArrival) || parseBool(latest)) {
    const newFlag = { $or: [{ newArrival: true }, { latest: true }] };
    if (queryObj.$or) {
      // Keep search $or and combine with new-arrival flag via $and
      queryObj.$and = [{ $or: queryObj.$or }, newFlag];
      delete queryObj.$or;
    } else {
      Object.assign(queryObj, newFlag);
    }
  }

  if (status === "draft" || status === "published") {
    queryObj.status = status;
  } else if (parseBool(publishedOnly)) {
    queryObj.status = { $ne: "draft" };
  } else if (!parseBool(reqQuery.includeDrafts)) {
    queryObj.status = { $ne: "draft" };
  }

  if (stockStatus === "out_of_stock") {
    queryObj.stock = { $lte: 0 };
  } else if (stockStatus === "low_stock") {
    queryObj.$expr = {
      $and: [
        { $gt: ["$stock", 0] },
        { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 15] }] }
      ]
    };
  } else if (stockStatus === "in_stock") {
    queryObj.stock = { $gt: 0 };
  }

  if (parseBool(hasDiscount) || Number(minDiscount) > 0) {
    const floor = Number(minDiscount) > 0 ? Number(minDiscount) : 1;
    queryObj.discount = { $gte: floor };
  }

  return queryObj;
};

export const getProducts = async (req, res, next) => {
  try {
    const { sort, page = 1, limit = 12 } = req.query;
    const queryObj = await buildProductQuery(req.query);

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    const sortSpec = resolveProductSort(sort);
    const total = await Product.countDocuments(queryObj);
    const pages = Math.max(1, Math.ceil(total / limitNum));

    const products = await Product.find(queryObj)
      .populate("category", "name slug subcategories")
      .sort(sortSpec)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      products,
      count: products.length,
      total,
      page: pageNum,
      pages,
      // Back-compat aliases for older web clients
      totalProducts: total,
      totalPages: pages,
      currentPage: pageNum
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryStats = async (req, res, next) => {
  try {
    const [total, published, draft, outOfStock, lowStock, inStock] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: "published" }),
      Product.countDocuments({ status: "draft" }),
      Product.countDocuments({ stock: { $lte: 0 } }),
      Product.countDocuments({
        $expr: {
          $and: [
            { $gt: ["$stock", 0] },
            { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 15] }] }
          ]
        }
      }),
      Product.countDocuments({
        $expr: { $gt: ["$stock", { $ifNull: ["$lowStockThreshold", 15] }] }
      })
    ]);

    res.status(200).json({
      success: true,
      stats: { total, published, draft, outOfStock, lowStock, inStock }
    });
  } catch (error) {
    next(error);
  }
};

export const exportProducts = async (req, res, next) => {
  try {
    const queryObj = await buildProductQuery(req.query);
    const products = await Product.find(queryObj)
      .populate("category", "name")
      .sort("-createdAt")
      .lean();

    const header = [
      "Title",
      "SKU",
      "Slug",
      "Brand",
      "Category",
      "Subcategory",
      "MRP",
      "SalePrice",
      "Discount",
      "Stock",
      "Status",
      "Rating",
      "Reviews",
      "Sold",
      "CreatedAt"
    ];

    const rows = products.map((p) => [
      JSON.stringify(p.title || ""),
      p.sku || "",
      p.slug || "",
      JSON.stringify(p.brand || ""),
      JSON.stringify(p.category?.name || ""),
      JSON.stringify(p.subcategory || ""),
      p.mrp ?? "",
      p.salePrice ?? "",
      p.discount ?? "",
      p.stock ?? "",
      p.status || "published",
      p.rating ?? 0,
      p.reviewCount ?? 0,
      p.soldCount ?? 0,
      p.createdAt ? new Date(p.createdAt).toISOString() : ""
    ].join(","));

    const csv = [header.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="products-export.csv"');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

export const bulkProducts = async (req, res, next) => {
  try {
    const { action, ids } = req.body;
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "action and ids are required" });
    }

    const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (action === "delete") {
      await Product.deleteMany({ _id: { $in: objectIds } });
      await User.updateMany(
        {},
        {
          $pull: {
            cart: { product: { $in: objectIds } },
            wishlist: { $in: objectIds },
            likes: { $in: objectIds }
          }
        }
      );
      return res.status(200).json({ success: true, message: `Deleted ${objectIds.length} products` });
    }

    if (action === "publish") {
      await Product.updateMany({ _id: { $in: objectIds } }, { $set: { status: "published" } });
      return res.status(200).json({ success: true, message: `Published ${objectIds.length} products` });
    }

    if (action === "unpublish") {
      await Product.updateMany({ _id: { $in: objectIds } }, { $set: { status: "draft" } });
      return res.status(200).json({ success: true, message: `Unpublished ${objectIds.length} products` });
    }

    return res.status(400).json({ success: false, message: "Unsupported bulk action" });
  } catch (error) {
    next(error);
  }
};

export const getProductAnalytics = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).select(
      "title soldCount revenue wishlistCount cartCount viewCount orderCount returnCount refundCount rating reviewCount"
    );
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const conversionRate =
      product.viewCount > 0
        ? Number(((product.soldCount / product.viewCount) * 100).toFixed(2))
        : 0;

    res.status(200).json({
      success: true,
      analytics: {
        soldCount: product.soldCount || 0,
        revenue: product.revenue || 0,
        wishlistCount: product.wishlistCount || 0,
        cartCount: product.cartCount || 0,
        viewCount: product.viewCount || 0,
        orderCount: product.orderCount || 0,
        returnCount: product.returnCount || 0,
        refundCount: product.refundCount || 0,
        conversionRate,
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name slug subcategories");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Fire-and-forget view increment
    Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } }).catch(() => {});

    const relatedProducts = await Product.find({
      category: product.category?._id || product.category,
      _id: { $ne: product._id },
      status: { $ne: "draft" }
    })
      .limit(6)
      .populate("category", "name slug");

    res.status(200).json({
      success: true,
      product,
      relatedProducts
    });
  } catch (error) {
    next(error);
  }
};

export const getRelatedProducts = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).select("category");
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found", code: "NOT_FOUND" });
    }
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6));
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      status: { $ne: "draft" }
    })
      .limit(limit)
      .populate("category", "name slug")
      .select("title images salePrice mrp brand rating discount featured newArrival");

    res.status(200).json({ success: true, relatedProducts, count: relatedProducts.length });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const body = req.body;
    const images = normalizeImages(body.images);
    const colorVariants = normalizeColorVariants(body.colorVariants);

    const galleryError = validateGalleries({ images, colorVariants });
    if (galleryError) {
      return res.status(400).json({ success: false, message: galleryError });
    }

    const sku = String(body.sku || "").toUpperCase().trim();
    const existingSku = await Product.findOne({ sku });
    if (existingSku) {
      return res.status(400).json({ success: false, message: `Product with SKU ${sku} already exists` });
    }

    let slug = body.slug ? slugify(body.slug) : slugify(body.title);
    if (slug) {
      let candidate = slug;
      let i = 1;
      while (await Product.findOne({ slug: candidate })) {
        candidate = `${slug}-${i++}`;
      }
      slug = candidate;
    }

    const product = await Product.create({
      title: body.title,
      slug,
      shortDescription: body.shortDescription || "",
      description: body.description,
      sku,
      mrp: Number(body.mrp),
      salePrice: Number(body.salePrice),
      taxPercent: Number(body.taxPercent) || 0,
      shippingCost: Number(body.shippingCost) || 0,
      brand: body.brand,
      category: body.category,
      subcategory: body.subcategory,
      stock: Number(body.stock) || 0,
      lowStockThreshold: Number(body.lowStockThreshold) || 15,
      colors: body.colors,
      colorVariants,
      sizes: body.sizes,
      tags: body.tags,
      images: colorVariants.length > 0 ? colorVariants[0].images : images,
      videoUrl: body.videoUrl || "",
      view360Images: body.view360Images || [],
      specifications: body.specifications || [],
      seo: body.seo || {},
      status: body.status === "draft" ? "draft" : "published",
      featured: body.featured === true || body.featured === "true",
      trending: body.trending === true || body.trending === "true",
      bestSeller: body.bestSeller === true || body.bestSeller === "true",
      latest: body.latest === true || body.latest === "true",
      newArrival: body.newArrival === true || body.newArrival === "true",
      offerProduct: body.offerProduct === true || body.offerProduct === "true",
      badges: Array.isArray(body.badges) ? body.badges : [],
      displayConfig: body.displayConfig || {},
      warranty: body.warranty || "",
      materials: body.materials || []
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const body = req.body;
    const images = body.images !== undefined ? normalizeImages(body.images) : product.images;
    const colorVariants =
      body.colorVariants !== undefined
        ? normalizeColorVariants(body.colorVariants)
        : product.colorVariants;

    const galleryError = validateGalleries({ images, colorVariants });
    if (galleryError) {
      return res.status(400).json({ success: false, message: galleryError });
    }

    const assignable = [
      "title",
      "shortDescription",
      "description",
      "brand",
      "category",
      "subcategory",
      "videoUrl",
      "sizes",
      "tags",
      "specifications",
      "seo",
      "status",
      "featured",
      "trending",
      "bestSeller",
      "latest",
      "newArrival",
      "offerProduct",
      "badges",
      "displayConfig",
      "warranty",
      "materials"
    ];

    assignable.forEach((key) => {
      if (body[key] !== undefined) product[key] = body[key];
    });

    if (body.sku !== undefined) product.sku = String(body.sku).toUpperCase().trim();
    if (body.slug !== undefined) product.slug = slugify(body.slug);
    if (body.mrp !== undefined) product.mrp = Number(body.mrp);
    if (body.salePrice !== undefined) product.salePrice = Number(body.salePrice);
    if (body.taxPercent !== undefined) product.taxPercent = Number(body.taxPercent) || 0;
    if (body.shippingCost !== undefined) product.shippingCost = Number(body.shippingCost) || 0;
    if (body.stock !== undefined) product.stock = Number(body.stock) || 0;
    if (body.lowStockThreshold !== undefined) {
      product.lowStockThreshold = Number(body.lowStockThreshold) || 15;
    }

    product.images = colorVariants.length > 0 ? colorVariants[0].images : images;
    product.colorVariants = colorVariants;
    if (body.view360Images !== undefined) product.view360Images = body.view360Images;

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await User.updateMany(
      {},
      {
        $pull: {
          cart: { product: productId },
          wishlist: productId,
          likes: productId
        }
      }
    );

    res.status(200).json({
      success: true,
      message: "Product deleted successfully and purged from user carts & wishlists"
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ enabled: { $ne: false } }).sort({ order: 1, name: 1 });
    const payload = categories.map((c) => {
      const obj = c.toObject();
      obj.subcategories = (c.subcategories || [])
        .map((item, index) => {
          if (typeof item === "string") return { name: item, enabled: true, order: index };
          return {
            name: item?.name || "",
            enabled: item?.enabled !== false,
            order: Number(item?.order) || index
          };
        })
        .filter((s) => s.name && s.enabled)
        .sort((a, b) => a.order - b.order)
        .map((s) => s.name); // storefront keeps string names for query compatibility
      return obj;
    });
    res.status(200).json({ success: true, categories: payload });
  } catch (error) {
    next(error);
  }
};

export const getBrandsAndStats = async (req, res, next) => {
  try {
    const [catalogBrands, catalogColors, catalogSizes, catalogMaterials, catalogTags, productBrands, productColors, productSizes, categories] =
      await Promise.all([
        CatalogItem.find({ type: "brand", enabled: true }).sort({ order: 1, name: 1 }),
        CatalogItem.find({ type: "color", enabled: true }).sort({ order: 1, name: 1 }),
        CatalogItem.find({ type: "size", enabled: true }).sort({ order: 1, name: 1 }),
        CatalogItem.find({ type: "material", enabled: true }).sort({ order: 1, name: 1 }),
        CatalogItem.find({ type: "tag", enabled: true }).sort({ order: 1, name: 1 }),
        Product.distinct("brand", { status: { $ne: "draft" } }),
        Product.distinct("colors", { status: { $ne: "draft" } }),
        Product.distinct("sizes", { status: { $ne: "draft" } }),
        Category.find({ enabled: { $ne: false } }).select("name slug subcategories enabled order").sort({ order: 1, name: 1 })
      ]);

    const brandNames = catalogBrands.length
      ? catalogBrands.map((b) => b.name)
      : productBrands.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));

    const colorNames = catalogColors.length
      ? catalogColors.map((c) => c.name)
      : productColors.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));

    const sizeNames = catalogSizes.length
      ? catalogSizes.map((s) => s.name)
      : productSizes.filter(Boolean);

    const normalizedCategories = categories.map((c) => {
      const obj = c.toObject();
      obj.subcategories = (c.subcategories || [])
        .map((item, index) => {
          if (typeof item === "string") return { name: item, enabled: true, order: index };
          return {
            name: item?.name || "",
            enabled: item?.enabled !== false,
            order: Number(item?.order) || index
          };
        })
        .filter((s) => s.name && s.enabled)
        .sort((a, b) => a.order - b.order)
        .map((s) => s.name);
      return obj;
    });

    res.status(200).json({
      success: true,
      brands: brandNames,
      colors: colorNames,
      sizes: sizeNames,
      materials: catalogMaterials.map((m) => m.name),
      tags: catalogTags.map((t) => t.name),
      colorItems: catalogColors,
      sizeItems: catalogSizes,
      brandItems: catalogBrands,
      categories: normalizedCategories
    });
  } catch (error) {
    next(error);
  }
};

export { getStockStatus };
