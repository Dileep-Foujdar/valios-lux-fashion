import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { uploadImage } from "../config/cloudinary.js";

// 1. Get All Products with Filters, Search, Sorting, and Pagination
export const getProducts = async (req, res, next) => {
  try {
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
      sort,
      page = 1,
      limit = 12
    } = req.query;

    const queryObj = {};

    // Dynamic Search (supports title, description, tags)
    if (search) {
      queryObj.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }

    // Category Filter (works with Category ID or Category slug/name if we populate)
    if (category) {
      // Find category by slug/name first
      const categoryDoc = await Category.findOne({
        $or: [{ slug: category.toLowerCase() }, { name: category }]
      });
      if (categoryDoc) {
        queryObj.category = categoryDoc._id;
      }
    }

    // Subcategory Filter
    if (subcategory) {
      queryObj.subcategory = subcategory;
    }

    // Brand Filter (comma-separated or single)
    if (brand) {
      const brandArray = brand.split(",");
      queryObj.brand = { $in: brandArray.map(b => new RegExp(`^${b.trim()}$`, "i")) };
    }

    // Price Filter
    if (minPrice || maxPrice) {
      queryObj.salePrice = {};
      if (minPrice) queryObj.salePrice.$gte = Number(minPrice);
      if (maxPrice) queryObj.salePrice.$lte = Number(maxPrice);
    }

    // Color Filter (comma-separated or single)
    if (color) {
      const colors = color.split(",").map(c => c.trim());
      queryObj.colors = { $in: colors.map(c => new RegExp(`^${c}$`, "i")) };
    }

    // Size Filter (comma-separated or single)
    if (size) {
      const sizes = size.split(",").map(s => s.trim());
      queryObj.sizes = { $in: sizes.map(s => new RegExp(`^${s}$`, "i")) };
    }

    // Rating Filter
    if (rating) {
      queryObj.rating = { $gte: Number(rating) };
    }

    // Boolean Status Flags
    if (featured === "true") queryObj.featured = true;
    if (trending === "true") queryObj.trending = true;
    if (bestSeller === "true") queryObj.bestSeller = true;
    if (latest === "true") queryObj.latest = true;
    if (newArrival === "true") queryObj.newArrival = true;
    if (offerProduct === "true") queryObj.offerProduct = true;

    // Build query
    let apiQuery = Product.find(queryObj).populate("category", "name slug");

    // Sorting
    if (sort) {
      if (sort === "price-low") {
        apiQuery = apiQuery.sort("salePrice");
      } else if (sort === "price-high") {
        apiQuery = apiQuery.sort("-salePrice");
      } else if (sort === "rating") {
        apiQuery = apiQuery.sort("-rating");
      } else if (sort === "newest") {
        apiQuery = apiQuery.sort("-createdAt");
      } else if (sort === "discount") {
        apiQuery = apiQuery.sort("-discount");
      }
    } else {
      apiQuery = apiQuery.sort("-createdAt"); // Default newest
    }

    // Pagination
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    const totalProducts = await Product.countDocuments(queryObj);
    
    apiQuery = apiQuery.skip(skip).limit(limitNum);
    const products = await apiQuery;

    res.status(200).json({
      success: true,
      count: products.length,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limitNum),
      currentPage: pageNum,
      products
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Single Product details and Related Products
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name slug");
    
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Find related products in the same category, excluding current product
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id }
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

// 3. Create Product (Admin/Owner)
export const createProduct = async (req, res, next) => {
  try {
    const { title, description, sku, mrp, salePrice, brand, category, subcategory, stock, colors, sizes, tags, featured, trending, bestSeller, latest, newArrival, offerProduct, videoUrl, images } = req.body;

    // Check unique SKU
    const existingSku = await Product.findOne({ sku: sku.toUpperCase().trim() });
    if (existingSku) {
      return res.status(400).json({ success: false, message: `Product with SKU ${sku} already exists` });
    }

    // Process and upload images
    const uploadedImages = [];
    if (images && Array.isArray(images)) {
      for (const img of images) {
        const url = await uploadImage(img, "products");
        uploadedImages.push(url);
      }
    }

    const product = await Product.create({
      title,
      description,
      sku: sku.toUpperCase().trim(),
      mrp,
      salePrice,
      brand,
      category,
      subcategory,
      stock,
      colors,
      sizes,
      tags,
      images: uploadedImages,
      videoUrl,
      featured: featured === true || featured === "true",
      trending: trending === true || trending === "true",
      bestSeller: bestSeller === true || bestSeller === "true",
      latest: latest === true || latest === "true",
      newArrival: newArrival === true || newArrival === "true",
      offerProduct: offerProduct === true || offerProduct === "true"
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

// 4. Update Product (Admin/Owner)
export const updateProduct = async (req, res, next) => {
  try {
    const { images, ...otherFields } = req.body;
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Update fields
    Object.keys(otherFields).forEach(key => {
      product[key] = otherFields[key];
    });

    // If new images provided
    if (images && Array.isArray(images) && images.length > 0) {
      const uploadedImages = [];
      for (const img of images) {
        const url = await uploadImage(img, "products");
        uploadedImages.push(url);
      }
      product.images = uploadedImages;
    }

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

// 5. Delete Product (Admin/Owner)
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

// 6. Get Categories list
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    next(error);
  }
};

// 7. Get Brands and Statistics
export const getBrandsAndStats = async (req, res, next) => {
  try {
    const brands = await Product.distinct("brand");
    const categories = await Category.find().select("name slug");
    
    res.status(200).json({
      success: true,
      brands,
      categories
    });
  } catch (error) {
    next(error);
  }
};
