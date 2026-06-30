"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { IoHeart, IoHeartOutline, IoBagAddOutline, IoCheckmarkCircleOutline, IoCameraOutline } from "react-icons/io5";
import toast from "react-hot-toast";

import Navbar from "../../../components/Navbar.js";
import Footer from "../../../components/Footer.js";
import ProductCard from "../../../components/ProductCard.js";
import { ProductDetailSkeleton } from "../../../components/Skeleton.js";
import { localToggleWishlist } from "../../../store/slices/wishlistSlice.js";
import { localAddToCart } from "../../../store/slices/cartSlice.js";
import api from "../../../utils/api.js";

const ProductDetailClient = ({ productId }) => {
  const router = useRouter();
  const dispatch = useDispatch();

  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const wishlistItems = useSelector((state) => state.wishlist.items) || [];
  const isWishlisted = wishlistItems.some(item => item._id === productId);

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gallery tabs: "images" | "video" | "360"
  const [activeMediaTab, setActiveMediaTab] = useState("images");
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [rotationIdx, setRotationIdx] = useState(0); // For 360 view slider
  
  // Custom Zoom Position
  const [zoomStyle, setZoomStyle] = useState({ display: "none" });

  // User Selections
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Review Form States
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [reviewImages, setReviewImages] = useState([]); // Base64 strings

  // Fetch product data
  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      try {
        const [prodRes, revRes] = await Promise.all([
          api.get(`/products/${productId}`),
          api.get(`/reviews/${productId}`)
        ]);

        if (prodRes.data.success) {
          setProduct(prodRes.data.product);
          setRelated(prodRes.data.relatedProducts || []);
          
          // Pre-select first color/size
          if (prodRes.data.product.colors?.length > 0) setSelectedColor(prodRes.data.product.colors[0]);
          if (prodRes.data.product.sizes?.length > 0) setSelectedSize(prodRes.data.product.sizes[0]);
        }

        if (revRes.data.success) {
          setReviews(revRes.data.reviews);
        }
      } catch (err) {
        console.error("Fetch details error:", err);
        toast.error("Failed to load product details.");
      } finally {
        setLoading(false);
      }
    };
    fetchProductDetails();
  }, [productId]);

  // Image Magnifier Hover Math
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomStyle({
      display: "block",
      backgroundImage: `url(${product.images[selectedImageIdx]})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: "200%"
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: "none" });
  };

  // Add to Wishlist
  const handleWishlistToggle = async () => {
    if (!product) return;
    dispatch(localToggleWishlist(product));
    
    if (isAuthenticated) {
      try {
        await api.post("/users/wishlist", { productId: product._id });
      } catch (err) {
        console.error(err);
      }
    } else {
      toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
    }
  };

  // Add to Cart
  const handleAddToCart = async (checkoutImmediately = false) => {
    if (!selectedColor || !selectedSize) {
      toast.error("Please select a Color and Size");
      return;
    }

    dispatch(localAddToCart({ product, quantity, color: selectedColor, size: selectedSize }));
    toast.success("Added to Cart!");

    if (isAuthenticated) {
      try {
        await api.post("/users/cart", {
          productId: product._id,
          quantity,
          color: selectedColor,
          size: selectedSize
        });
      } catch (err) {
        console.error("Cart sync error:", err);
      }
    }

    if (checkoutImmediately) {
      router.push("/cart");
    }
  };

  // Handle Review Image select (convert to base64)
  const handleReviewImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReviewImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Submit Feedback Review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please log in to submit a review");
      router.push("/auth");
      return;
    }

    if (!commentInput.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    const loadId = toast.loading("Submitting review...");
    try {
      const res = await api.post("/reviews", {
        productId: product._id,
        rating: ratingInput,
        comment: commentInput,
        images: reviewImages
      });

      if (res.data.success) {
        toast.success("Review submitted successfully!", { id: loadId });
        setCommentInput("");
        setReviewImages([]);
        
        // Refresh reviews list
        const revRes = await api.get(`/reviews/${productId}`);
        if (revRes.data.success) setReviews(revRes.data.reviews);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Submit failed. Try again.", { id: loadId });
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors">
        
        {loading ? (
          <ProductDetailSkeleton />
        ) : !product ? (
          <div className="py-20 text-center uppercase tracking-widest font-black">
            Product Not Found
          </div>
        ) : (
          <div className="flex flex-col gap-16">
            
            {/* Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
              
              {/* LEFT COLUMN: INTERACTIVE MEDIA GALLERY */}
              <div className="flex flex-col gap-4">
                
                {/* Main Media window */}
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-900">
                  
                  {activeMediaTab === "images" && (
                    <div
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      className="relative h-full w-full cursor-zoom-in overflow-hidden"
                    >
                      <img
                        src={product.images?.[selectedImageIdx]}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                      {/* Magnified Hover Loupe */}
                      <div
                        style={zoomStyle}
                        className="absolute inset-0 pointer-events-none border border-zinc-100 rounded-3xl"
                      />
                    </div>
                  )}

                  {activeMediaTab === "video" && (
                    <div className="h-full w-full flex items-center justify-center">
                      {product.videoUrl ? (
                        <video src={product.videoUrl} controls autoPlay className="h-full w-full object-cover" />
                      ) : (
                        <p className="text-xs text-zinc-400">No video walk-around available</p>
                      )}
                    </div>
                  )}

                  {activeMediaTab === "360" && (
                    <div className="relative h-full w-full flex flex-col justify-between p-4">
                      <div className="flex-1 flex items-center justify-center overflow-hidden">
                        <img
                          src={product.view360Images?.[rotationIdx] || product.images?.[0]}
                          alt="360 view"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      
                      {/* Slider Control */}
                      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[10px] font-bold text-center text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                          Slide to rotate 360&deg;
                        </p>
                        <input
                          type="range"
                          min={0}
                          max={(product.view360Images?.length || 1) - 1}
                          value={rotationIdx}
                          onChange={(e) => setRotationIdx(Number(e.target.value))}
                          className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800 accent-black dark:accent-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Option Selectors */}
                <div className="flex justify-between items-center gap-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveMediaTab("images")}
                      className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${activeMediaTab === "images" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900"}`}
                    >
                      Gallery
                    </button>
                    {product.videoUrl && (
                      <button
                        onClick={() => setActiveMediaTab("video")}
                        className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${activeMediaTab === "video" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900"}`}
                      >
                        Video
                      </button>
                    )}
                    {product.view360Images?.length > 0 && (
                      <button
                        onClick={() => setActiveMediaTab("360")}
                        className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${activeMediaTab === "360" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900"}`}
                      >
                        360 View
                      </button>
                    )}
                  </div>
                </div>

                {/* Gallery Thumbnails */}
                {activeMediaTab === "images" && (
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    {product.images?.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIdx(idx)}
                        className={`relative aspect-square overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-900 border transition-all ${selectedImageIdx === idx ? "border-black dark:border-white" : "border-transparent"}`}
                      >
                        <img src={img} alt="thumbnail" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: INFORMATION & CONFIG */}
              <div className="flex flex-col gap-6">
                <div>
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    {product.brand}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold uppercase mt-1 tracking-tight text-zinc-900 dark:text-white">
                    {product.title}
                  </h1>
                  
                  {/* Rating Stars summary */}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex text-amber-500 text-sm">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i}>{i < Math.round(product.rating) ? "★" : "☆"}</span>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {product.rating} / 5
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      ({reviews.length} Verified Customer Reviews)
                    </span>
                  </div>
                </div>

                {/* Pricing block */}
                <div className="rounded-2xl bg-zinc-50 p-6 border border-zinc-100 dark:bg-zinc-900/40 dark:border-zinc-900">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-zinc-900 dark:text-white">₹{product.salePrice}</span>
                    {product.mrp > product.salePrice && (
                      <>
                        <span className="text-sm text-zinc-400 line-through dark:text-zinc-500">₹{product.mrp}</span>
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded dark:bg-red-950/20">
                          {product.discount}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 font-medium">Inclusive of all taxes & local GST. Delivery calculated at checkout.</p>
                </div>

                {/* Dynamic Configuration Selection */}
                <div className="flex flex-col gap-4 border-y border-zinc-100 py-6 dark:border-zinc-900">
                  {/* Colors */}
                  {product.colors?.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
                        Select Color
                      </h4>
                      <div className="flex gap-2.5">
                        {product.colors.map(col => (
                          <button
                            key={col}
                            onClick={() => setSelectedColor(col)}
                            className={`rounded-full px-4 py-2 border text-xs font-bold transition-all ${selectedColor === col ? "border-black bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950" : "border-zinc-200 text-zinc-500 dark:border-zinc-800"}`}
                          >
                            {col}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sizes */}
                  {product.sizes?.length > 0 && (
                    <div className="mt-2">
                      <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
                        Select Size
                      </h4>
                      <div className="flex gap-2">
                        {product.sizes.map(sz => (
                          <button
                            key={sz}
                            onClick={() => setSelectedSize(sz)}
                            className={`h-10 w-10 border rounded-xl flex items-center justify-center text-xs font-bold transition-all ${selectedSize === sz ? "border-black bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950" : "border-zinc-200 text-zinc-500 dark:border-zinc-800"}`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity selector */}
                  <div className="mt-2">
                    <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
                      Quantity
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="flex border border-zinc-200 rounded-xl dark:border-zinc-800 overflow-hidden">
                        <button
                          onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                          className="h-9 w-9 flex items-center justify-center font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          −
                        </button>
                        <span className="h-9 w-12 flex items-center justify-center text-xs font-bold dark:text-white">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
                          className="h-9 w-9 flex items-center justify-center font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                        {product.stock} items available in stock
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex gap-4">
                  <button
                    onClick={() => handleAddToCart(false)}
                    className="flex-1 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 dark:text-white transition-colors"
                  >
                    <IoBagAddOutline className="text-base" /> Add to Cart
                  </button>
                  <button
                    onClick={() => handleAddToCart(true)}
                    className="flex-1 rounded-full bg-black py-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
                  >
                    Buy Now
                  </button>
                  <button
                    onClick={handleWishlistToggle}
                    className={`h-14 w-14 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors dark:border-zinc-800 dark:hover:bg-zinc-900 ${isWishlisted ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"}`}
                  >
                    {isWishlisted ? <IoHeart className="text-xl" /> : <IoHeartOutline className="text-xl" />}
                  </button>
                </div>
              </div>

            </div>

            {/* PRODUCT SPECIFICATIONS & DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 border-t border-zinc-100 pt-16 dark:border-zinc-900">
              <div className="md:col-span-2">
                <h3 className="text-sm font-extrabold uppercase tracking-wider mb-4">Product Description</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  {product.description}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider mb-4">Specifications</h3>
                <table className="w-full text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  <tbody>
                    {product.specifications?.map((spec, i) => (
                      <tr key={i} className="border-b border-zinc-100 dark:border-zinc-900">
                        <td className="py-2.5 text-zinc-400 uppercase tracking-wide text-[10px]">{spec.name}</td>
                        <td className="py-2.5 text-right font-bold text-zinc-800 dark:text-zinc-200">{spec.value}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="py-2.5 text-zinc-400 uppercase tracking-wide text-[10px]">SKU Code</td>
                      <td className="py-2.5 text-right font-bold text-zinc-850 dark:text-zinc-250 uppercase">{product.sku}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* REVIEWS & VERIFIED CUSTOMER FEEDBACK */}
            <div className="border-t border-zinc-100 pt-16 dark:border-zinc-900">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                
                {/* Submit Feedback Form */}
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider">Leave Feedback</h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">Share your experience with other shoppers</p>
                  </div>

                  <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
                    {/* Star Rating select */}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block">
                        Rating Stars
                      </label>
                      <div className="flex gap-2 text-2xl text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setRatingInput(i + 1)}
                            className="transition-transform hover:scale-110"
                          >
                            {i < ratingInput ? "★" : "☆"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Review text */}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block">
                        Review Details
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Write details about product material, fit, stitching, and style..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-white dark:text-white"
                      />
                    </div>

                    {/* Images selector (base64) */}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block">
                        Upload Product Photos
                      </label>
                      <div className="flex flex-wrap gap-2 items-center">
                        <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-300 hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
                          <IoCameraOutline className="text-xl text-zinc-400" />
                          <input type="file" multiple accept="image/*" className="hidden" onChange={handleReviewImageChange} />
                        </label>
                        {reviewImages.map((img, i) => (
                          <div key={i} className="relative h-12 w-12 rounded-xl overflow-hidden border border-zinc-100">
                            <img src={img} alt="review upload" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setReviewImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px]"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="rounded-xl bg-black py-3 text-xs font-bold text-white uppercase tracking-wider transition-colors hover:bg-zinc-850 dark:bg-white dark:text-black dark:hover:bg-zinc-150"
                    >
                      Submit Review
                    </button>
                  </form>
                </div>

                {/* Reviews List */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider">Customer Reviews</h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">Showing all verified customer inputs</p>
                  </div>

                  {reviews.length === 0 ? (
                    <div className="border border-dashed border-zinc-100 rounded-2xl p-10 text-center dark:border-zinc-900">
                      <p className="text-xs text-zinc-400">No reviews yet for this product. Be the first to leave one!</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {reviews.map((rev) => (
                        <div key={rev._id} className="border-b border-zinc-50 pb-6 dark:border-zinc-900 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{rev.user.name}</h4>
                              <div className="flex text-amber-500 text-[10px] mt-0.5">
                                {Array.from({ length: 5 }).map((_, idx) => (
                                  <span key={idx}>{idx < rev.rating ? "★" : "☆"}</span>
                                ))}
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                            {rev.comment}
                          </p>

                          {/* Review Images */}
                          {rev.images?.length > 0 && (
                            <div className="flex gap-2">
                              {rev.images.map((img, idx) => (
                                <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="relative h-14 w-14 rounded-xl overflow-hidden border border-zinc-100">
                                  <img src={img} alt="customer upload" className="h-full w-full object-cover" />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Official replies */}
                          {rev.replies?.map((rep, idx) => (
                            <div key={idx} className="ml-6 rounded-2xl bg-zinc-50 p-4 border border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-900 flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <IoCheckmarkCircleOutline className="text-emerald-500 text-sm" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                  Official Brand Response
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                                "{rep.comment}"
                              </p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* RELATED PRODUCTS */}
            {related.length > 0 && (
              <div className="border-t border-zinc-100 pt-16 dark:border-zinc-900">
                <div className="text-center mb-10">
                  <h2 className="text-xl font-extrabold uppercase tracking-wider">Style With These</h2>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">Pairing selections handpicked for you</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {related.slice(0, 4).map(prod => (
                    <ProductCard key={prod._id} product={prod} />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </main>
      <Footer />
    </>
  );
};

export default ProductDetailClient;
