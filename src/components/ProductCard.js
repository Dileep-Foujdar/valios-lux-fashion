"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  IoHeart,
  IoHeartOutline,
  IoBagAddOutline,
  IoEyeOutline,
  IoGitCompareOutline,
  IoFlashOutline,
} from "react-icons/io5";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";

import { localToggleWishlist } from "../store/slices/wishlistSlice.js";
import { localAddToCart } from "../store/slices/cartSlice.js";
import api from "../utils/api.js";
import QuickViewModal from "./QuickViewModal.js";
import {
  resolveProductVisibility,
  getActiveProductBadges,
} from "../utils/productDisplay.js";

const formatPrice = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const getStockLabel = (product) => {
  const status = product.stockStatus || (product.stock > 0 ? "in_stock" : "out_of_stock");
  if (status === "out_of_stock" || product.stock <= 0) {
    return { label: "Out of Stock", tone: "text-red-500 bg-red-50 dark:bg-red-950/40" };
  }
  if (status === "low_stock") {
    return { label: "Limited Stock", tone: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" };
  }
  return { label: "In Stock", tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" };
};

const ProductCard = ({
  product,
  onQuickView,
  onCompareToggle,
  isCompared = false,
}) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const wishlistItems = useSelector((state) => state.wishlist.items) || [];
  const globalVisibility = useSelector((state) => state.settings.productVisibility);

  const visibility = resolveProductVisibility(product, globalVisibility);
  const badges = getActiveProductBadges(product).slice(0, 3);

  const isWishlisted = wishlistItems.some((item) => item._id === product._id);
  const [cartLoading, setCartLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [selfQuickView, setSelfQuickView] = useState(false);

  const categoryName =
    typeof product.category === "object" ? product.category?.name : product.category;
  const stockMeta = getStockLabel(product);
  const outOfStock = product.stock <= 0;
  const imageSrc = product.images?.[0] || "";

  const defaultColor = product.colors?.[0] || product.colorVariants?.[0]?.name || "Default";
  const defaultSize = product.sizes?.[0] || "FS";

  const syncCart = async (quantity = 1) => {
    dispatch(localAddToCart({ product, quantity, color: defaultColor, size: defaultSize }));
    if (isAuthenticated) {
      await api.post("/users/cart", {
        productId: product._id,
        quantity,
        color: defaultColor,
        size: defaultSize,
      });
    }
  };

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
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
    if (outOfStock || cartLoading) return;

    setCartLoading(true);
    try {
      await syncCart(1);
      toast.success("Added to Cart");
    } catch (err) {
      console.error("Cart sync error:", err);
      toast.error("Could not add to cart");
    } finally {
      setCartLoading(false);
    }
  };

  const handleBuyNow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || buyLoading) return;

    setBuyLoading(true);
    try {
      await syncCart(1);
      router.push("/checkout");
    } catch (err) {
      console.error("Buy now error:", err);
      toast.error("Could not start checkout");
      setBuyLoading(false);
    }
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) onQuickView(product);
    else setSelfQuickView(true);
  };

  const handleCompare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCompareToggle) onCompareToggle(product);
    else toast("Open the catalog to compare products");
  };

  const showActionBar = visibility.addToCart || visibility.buyNow;

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -6 }}
        transition={{ duration: 0.28 }}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl dark:border-zinc-900 dark:bg-zinc-950"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950">
          <Link href={`/product/${product._id}`} className="absolute inset-0 block">
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt={product.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
                No Image
              </div>
            )}
          </Link>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-70" />

          <div className="absolute left-3 top-3 z-10 flex max-w-[70%] flex-col gap-1.5">
            {badges.map((badge) => (
              <span
                key={badge.key || badge.label}
                className="w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                style={{ backgroundColor: badge.color || "#111111" }}
              >
                {badge.icon ? `${badge.icon} ` : ""}
                {badge.label}
              </span>
            ))}
            {visibility.discount && product.discount > 0 && (
              <span className="w-fit rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-red-600 shadow-sm backdrop-blur dark:bg-zinc-900/90">
                -{product.discount}%
              </span>
            )}
          </div>

          <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
            {visibility.wishlist && (
              <button
                type="button"
                onClick={handleWishlistToggle}
                aria-label="Toggle wishlist"
                className="btn-press flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-sm backdrop-blur transition hover:scale-105 hover:text-red-500 dark:bg-zinc-900/90 dark:text-white"
              >
                {isWishlisted ? <IoHeart className="text-lg text-red-500" /> : <IoHeartOutline className="text-lg" />}
              </button>
            )}
            {visibility.quickView && (
              <button
                type="button"
                onClick={handleQuickView}
                aria-label="Quick view"
                className="btn-press flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-sm backdrop-blur transition hover:scale-105 dark:bg-zinc-900/90 dark:text-white"
              >
                <IoEyeOutline className="text-lg" />
              </button>
            )}
            {visibility.compare && (
              <button
                type="button"
                onClick={handleCompare}
                aria-label="Compare"
                className={`btn-press flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur transition hover:scale-105 ${
                  isCompared
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                    : "bg-white/90 text-zinc-900 dark:bg-zinc-900/90 dark:text-white"
                }`}
              >
                <IoGitCompareOutline className="text-lg" />
              </button>
            )}
          </div>

          {showActionBar && (
            <div className="absolute inset-x-0 bottom-0 z-10 translate-y-3 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <div className={`grid gap-2 ${visibility.addToCart && visibility.buyNow ? "grid-cols-2" : "grid-cols-1"}`}>
                {visibility.addToCart && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={outOfStock || cartLoading}
                    className="btn-press flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900/95 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/95 dark:text-black"
                  >
                    <IoBagAddOutline className="text-sm" />
                    {cartLoading ? "Adding…" : "Add to Cart"}
                  </button>
                )}
                {visibility.buyNow && (
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={outOfStock || buyLoading}
                    className="btn-press flex items-center justify-center gap-1.5 rounded-xl bg-white/95 py-2.5 text-[11px] font-bold uppercase tracking-wide text-zinc-900 backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-900/95 dark:text-white"
                  >
                    <IoFlashOutline className="text-sm" />
                    {buyLoading ? "…" : "Buy Now"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            {visibility.brand ? (
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                {product.brand || "Brand"}
              </p>
            ) : (
              <span />
            )}
            {visibility.category && categoryName && (
              <span className="truncate text-[10px] font-semibold text-zinc-400">
                {categoryName}
              </span>
            )}
          </div>

          <Link href={`/product/${product._id}`} className="block">
            <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300">
              {product.title}
            </h3>
          </Link>

          {(visibility.ratings || visibility.reviews || visibility.soldCount) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {visibility.ratings && (
                <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-200">
                  <span className="text-amber-500">★</span>
                  {Number(product.rating || 0).toFixed(1)}
                </span>
              )}
              {visibility.reviews && (
                <span className="text-zinc-400">({product.reviewCount || 0} reviews)</span>
              )}
              {visibility.soldCount && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <span className="text-zinc-500">{product.soldCount || 0} sold</span>
                </>
              )}
            </div>
          )}

          {((visibility.colors && product.colors?.length > 0) ||
            (visibility.sizes && product.sizes?.length > 0)) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {visibility.colors &&
                product.colors?.slice(0, 4).map((color) => (
                  <span
                    key={color}
                    className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-800"
                  >
                    {color}
                  </span>
                ))}
              {visibility.sizes &&
                product.sizes?.slice(0, 3).map((size) => (
                  <span
                    key={size}
                    className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    {size}
                  </span>
                ))}
            </div>
          )}

          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            <div className="flex items-baseline gap-2">
              {visibility.offerPrice && (
                <span className="text-base font-bold text-zinc-900 dark:text-white">
                  {formatPrice(product.salePrice)}
                </span>
              )}
              {visibility.originalPrice && product.mrp > product.salePrice && (
                <span className="text-xs text-zinc-400 line-through">
                  {formatPrice(product.mrp)}
                </span>
              )}
            </div>
            {visibility.stockStatus && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stockMeta.tone}`}>
                {stockMeta.label}
              </span>
            )}
          </div>

          {(visibility.addToCart || visibility.buyNow) && (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
              {visibility.addToCart && (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={outOfStock || cartLoading}
                  className="btn-press rounded-xl bg-zinc-900 py-2 text-[11px] font-bold uppercase text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  {cartLoading ? "…" : "Cart"}
                </button>
              )}
              {visibility.buyNow && (
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={outOfStock || buyLoading}
                  className="btn-press rounded-xl border border-zinc-200 py-2 text-[11px] font-bold uppercase disabled:opacity-50 dark:border-zinc-800"
                >
                  Buy
                </button>
              )}
            </div>
          )}
        </div>
      </motion.article>

      {!onQuickView && visibility.quickView && (
        <QuickViewModal
          product={product}
          isOpen={selfQuickView}
          onClose={() => setSelfQuickView(false)}
        />
      )}
    </>
  );
};

export default ProductCard;
