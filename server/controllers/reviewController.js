import Review from "../models/Review.js";
import Product from "../models/Product.js";

// Helper to recalculate average ratings and count for a product
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

// 1. Create a Product Review
export const createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment, images } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Upsert review (one review per user per product)
    const review = await Review.findOneAndUpdate(
      { product: productId, user: req.user._id },
      { rating: Number(rating), comment, images: images || [] },
      { upsert: true, new: true, runValidators: true }
    );

    // Recalculate average rating
    await updateProductRating(productId);

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Product Reviews
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

// 3. Delete Review (Admin, Owner, or Author)
export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    // Check permissions
    const isAuthor = review.user.toString() === req.user._id.toString();
    const isAdmin = ["Admin", "Owner", "Super Admin"].includes(req.user.role);

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(req.params.id);

    // Recalculate rating
    await updateProductRating(productId);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

// 4. Reply to a Review (Admin / Owner / Brand official)
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
