"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { IoHeart, IoHeartOutline, IoBagAddOutline } from "react-icons/io5";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";

import { localToggleWishlist } from "../store/slices/wishlistSlice.js";
import { localAddToCart } from "../store/slices/cartSlice.js";
import api from "../utils/api.js";

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const wishlistItems = useSelector((state) => state.wishlist.items) || [];
  
  const isWishlisted = wishlistItems.some(item => item._id === product._id);
  const [isLiking, setIsLiking] = useState(false);

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle locally for instant UI response
    dispatch(localToggleWishlist(product));

    if (isAuthenticated) {
      try {
        await api.post("/users/wishlist", { productId: product._id });
      } catch (err) {
        console.error("Wishlist sync error:", err);
      }
    } else {
      toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Select first size and color as default
    const color = product.colors?.[0] || "Default";
    const size = product.sizes?.[0] || "FS";

    // Add locally
    dispatch(localAddToCart({ product, quantity: 1, color, size }));
    toast.success("Added to Cart!");

    if (isAuthenticated) {
      try {
        await api.post("/users/cart", {
          productId: product._id,
          quantity: 1,
          color,
          size
        });
      } catch (err) {
        console.error("Cart sync error:", err);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-900 dark:bg-zinc-950"
    >
      {/* Product Image */}
      <Link href={`/product/${product._id}`} className="relative aspect-[4/5] overflow-hidden bg-zinc-50 dark:bg-zinc-900">
        <img
          src={product.images?.[0] || "https://placehold.co/600x800"}
          alt={product.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Quick Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.discount > 0 && (
            <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              -{product.discount}%
            </span>
          )}
          {product.bestSeller && (
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              Bestseller
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          disabled={isLiking}
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-zinc-900 shadow-sm backdrop-blur-md transition-colors hover:bg-white hover:text-red-500 dark:bg-zinc-900/80 dark:text-white dark:hover:bg-zinc-900"
        >
          {isWishlisted ? (
            <IoHeart className="text-xl text-red-500" />
          ) : (
            <IoHeartOutline className="text-xl" />
          )}
        </button>

        {/* Quick Add Overlay */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full p-3 transition-transform duration-300 group-hover:translate-y-0">
          <button
            onClick={handleAddToCart}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900/90 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-zinc-900 dark:bg-white/90 dark:text-zinc-900 dark:hover:bg-white"
          >
            <IoBagAddOutline className="text-lg" />
            Add to Cart
          </button>
        </div>
      </Link>

      {/* Info Block */}
      <div className="flex flex-1 flex-col p-4 bg-white dark:bg-zinc-950">
        <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
          {product.brand}
        </p>
        <Link href={`/product/${product._id}`} className="mt-1 flex-1">
          <h3 className="line-clamp-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100 hover:text-black dark:hover:text-white transition-colors">
            {product.title}
          </h3>
        </Link>
        
        {/* Rating */}
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-amber-500 text-xs">★</span>
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {product.rating}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            ({product.reviewCount})
          </span>
        </div>

        {/* Pricing */}
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-base font-bold text-zinc-900 dark:text-white">
            ₹{product.salePrice}
          </span>
          {product.mrp > product.salePrice && (
            <span className="text-xs text-zinc-400 line-through dark:text-zinc-500">
              ₹{product.mrp}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
