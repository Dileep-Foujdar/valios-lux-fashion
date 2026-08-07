"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { IoBagAddOutline, IoFlashOutline } from "react-icons/io5";

import Modal from "./Modal.js";
import { localAddToCart } from "../store/slices/cartSlice.js";
import api from "../utils/api.js";
import { resolveProductVisibility } from "../utils/productDisplay.js";

const formatPrice = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const getInitialColor = (product) => {
  if (product?.colors?.length) return product.colors[0];
  const fromVariants = product?.colorVariants?.map((v) => v.name).filter(Boolean) || [];
  return fromVariants[0] || "Default";
};

const getInitialImage = (product, color) => {
  const variantImages = product?.colorVariants?.find((v) => v.name === color)?.images;
  return variantImages?.[0] || product?.images?.[0] || "";
};

const QuickViewBody = ({ product, onClose }) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const globalVisibility = useSelector((state) => state.settings.productVisibility);

  const initialColor = getInitialColor(product);
  const [activeImage, setActiveImage] = useState(() => getInitialImage(product, initialColor));
  const [color, setColor] = useState(initialColor);
  const [size, setSize] = useState(product.sizes?.[0] || "FS");
  const [cartLoading, setCartLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  const visibility = resolveProductVisibility(product, globalVisibility);
  const categoryName =
    typeof product.category === "object" ? product.category?.name : product.category;
  const outOfStock = product.stock <= 0;
  const gallery = (() => {
    const variant = product.colorVariants?.find((v) => v.name === color);
    if (variant?.images?.length) return variant.images;
    return product.images || [];
  })();

  const syncCart = async () => {
    dispatch(localAddToCart({ product, quantity: 1, color, size }));
    if (isAuthenticated) {
      await api.post("/users/cart", {
        productId: product._id,
        quantity: 1,
        color,
        size,
      });
    }
  };

  const handleAddToCart = async () => {
    if (outOfStock || cartLoading) return;
    setCartLoading(true);
    try {
      await syncCart();
      toast.success("Added to Cart");
    } catch (err) {
      toast.error("Could not add to cart");
    } finally {
      setCartLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (outOfStock || buyLoading) return;
    setBuyLoading(true);
    try {
      await syncCart();
      onClose?.();
      router.push("/checkout");
    } catch (err) {
      toast.error("Could not start checkout");
      setBuyLoading(false);
    }
  };

  const onSelectColor = (nextColor) => {
    setColor(nextColor);
    const variant = product.colorVariants?.find((v) => v.name === nextColor);
    if (variant?.images?.[0]) setActiveImage(variant.images[0]);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
          {activeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeImage}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs uppercase tracking-widest text-zinc-400">
              No Image
            </div>
          )}
        </div>
        {gallery.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {gallery.slice(0, 6).map((img) => (
              <button
                key={img}
                type="button"
                onClick={() => setActiveImage(img)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition ${
                  activeImage === img
                    ? "border-zinc-900 dark:border-white"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
            {visibility.brand ? product.brand : ""}
            {visibility.brand && visibility.category && categoryName ? " · " : ""}
            {visibility.category && categoryName ? categoryName : ""}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">
            {product.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {visibility.ratings && (
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                ★ {Number(product.rating || 0).toFixed(1)}
              </span>
            )}
            {visibility.reviews && <span>({product.reviewCount || 0} reviews)</span>}
            {visibility.soldCount && (
              <>
                <span>·</span>
                <span>{product.soldCount || 0} sold</span>
              </>
            )}
            {visibility.stockStatus && (
              <>
                <span>·</span>
                <span className={outOfStock ? "text-red-500" : "text-emerald-600"}>
                  {outOfStock ? "Out of Stock" : "In Stock"}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          {visibility.offerPrice && (
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {formatPrice(product.salePrice)}
            </span>
          )}
          {visibility.originalPrice && product.mrp > product.salePrice && (
            <span className="text-sm text-zinc-400 line-through">
              {formatPrice(product.mrp)}
            </span>
          )}
          {visibility.discount && product.discount > 0 && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-950/40">
              -{product.discount}%
            </span>
          )}
        </div>

        {visibility.shortDescription && (product.shortDescription || product.description) ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {product.shortDescription || product.description}
          </p>
        ) : null}

        {visibility.colors && (product.colors?.length > 0 || product.colorVariants?.length > 0) && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Color</p>
            <div className="flex flex-wrap gap-2">
              {(product.colors?.length
                ? product.colors
                : product.colorVariants.map((v) => v.name)
              ).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onSelectColor(c)}
                  className={`btn-press rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    color === c
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {visibility.sizes && product.sizes?.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Size</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`btn-press rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    size === s
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`mt-auto grid gap-3 pt-2 ${visibility.addToCart && visibility.buyNow ? "grid-cols-2" : "grid-cols-1"}`}>
          {visibility.addToCart && (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={outOfStock || cartLoading}
              className="btn-press flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-black disabled:opacity-50 dark:bg-white dark:text-black"
            >
              <IoBagAddOutline />
              {cartLoading ? "Adding…" : "Add to Cart"}
            </button>
          )}
          {visibility.buyNow && (
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={outOfStock || buyLoading}
              className="btn-press flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 text-xs font-bold uppercase tracking-wide transition hover:border-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:hover:border-white"
            >
              <IoFlashOutline />
              {buyLoading ? "…" : "Buy Now"}
            </button>
          )}
        </div>

        <Link
          href={`/product/${product._id}`}
          onClick={onClose}
          className="text-center text-xs font-bold uppercase tracking-wider text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline dark:hover:text-white"
        >
          View full details
        </Link>
      </div>
    </div>
  );
};

const QuickViewModal = ({ product, isOpen, onClose }) => {
  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick View" maxWidthClass="max-w-3xl">
      {isOpen && (
        <QuickViewBody
          key={`${product._id}-${isOpen}`}
          product={product}
          onClose={onClose}
        />
      )}
    </Modal>
  );
};

export default QuickViewModal;
