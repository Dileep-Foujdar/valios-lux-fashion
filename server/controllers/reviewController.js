import mongoose from "mongoose";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

const updateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      rating: Number(stats[0].avgRating.toFixed(1)),
      reviewCount: stats[0].count
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      rating: 0,
      reviewCount: 0
    });
  }
};

const hasVerifiedPurchase = async (userId, productId) => {
  const order = await Order.findOne({
    customer: userId,
    "items.product": productId,
    $or: [
      { orderStatus: "Delivered" },
      { paymentStatus: "Paid", orderStatus: { $nin: ["Cancelled", "Returned"] } }
    ]
  }).select("_id");
  return Boolean(order);
};

export const createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment, images } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const verifiedPurchase = await hasVerifiedPurchase(req.user._id, productId);

    const review = await Review.findOneAndUpdate(
      { product: productId, user: req.user._id },
      {
        rating: Number(rating),
        comment,
        images: images || [],
        verifiedPurchase
      },
      { upsert: true, new: true, runValidators: true }
    );

    await updateProductRating(productId);

    const populated = await Review.findById(review._id).populate("user", "name email role");

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review: populated
    });
  } catch (error) {
    next(error);
  }
};

export const getProductReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate("user", "name email role")
      .populate("replies.user", "name role")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewSummary = async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId).select("rating reviewCount title");
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const oid = new mongoose.Types.ObjectId(productId);
    const distributionAgg = await Review.aggregate([
      { $match: { product: oid } },
      { $group: { _id: "$rating", count: { $sum: 1 } } }
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distributionAgg.forEach((row) => {
      distribution[row._id] = row.count;
    });

    res.status(200).json({
      success: true,
      summary: {
        averageRating: product.rating || 0,
        totalReviews: product.reviewCount || 0,
        distribution
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const isAuthor = review.user.toString() === req.user._id.toString();
    const isAdmin = ["Admin", "Owner", "Super Admin"].includes(req.user.role);

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(req.params.id);
    await updateProductRating(productId);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const replyToReview = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    review.replies.push({
      user: req.user._id,
      comment
    });

    await review.save();

    const updatedReview = await Review.findById(review._id)
      .populate("user", "name email role")
      .populate("replies.user", "name role");

    res.status(200).json({
      success: true,
      message: "Reply added successfully",
      review: updatedReview
    });
  } catch (error) {
    next(error);
  }
};
