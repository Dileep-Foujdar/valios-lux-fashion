"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { IoTrashOutline, IoBagCheckOutline, IoGiftOutline, IoCartOutline } from "react-icons/io5";
import toast from "react-hot-toast";

import Navbar from "../../components/Navbar.js";
import Footer from "../../components/Footer.js";
import {
  setCart,
  localUpdateCartQty,
  localRemoveFromCart,
  applyCouponCode,
  removeCouponCode,
  recalculateTotals
} from "../../store/slices/cartSlice.js";
import api from "../../utils/api.js";

const CartPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { items, subtotal, gst, shipping, coupon, couponDiscount, total } = useSelector((state) => state.cart);
  const theme = useSelector((state) => state.settings.theme);

  const [couponInput, setCouponInput] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync cart from Database if authenticated on mount
  useEffect(() => {
    if (isAuthenticated) {
      const syncCart = async () => {
        setLoading(true);
        try {
          const res = await api.get("/users/cart");
          if (res.data.success) {
            dispatch(setCart(res.data.cart));
          }
        } catch (err) {
          console.error("Cart sync error:", err);
        } finally {
          setLoading(false);
        }
      };
      syncCart();
    }
  }, [isAuthenticated, dispatch]);

  // Recalculate totals on item length modifications or mount
  useEffect(() => {
    // Queries default settings to adjust taxes/shipping
    const fetchCharges = async () => {
      try {
        const res = await api.get("/admin/settings");
        if (res.data.success) {
          const { taxPercentage, deliveryCharges } = res.data.settings;
          dispatch(recalculateTotals({
            gst: taxPercentage?.gst || 18,
            minFreeDelivery: deliveryCharges?.minAmountForFreeDelivery || 999,
            defaultCharge: deliveryCharges?.defaultCharge || 99
          }));
        }
      } catch (err) {
        dispatch(recalculateTotals());
      }
    };
    fetchCharges();
  }, [items, dispatch]);

  // Modify Qty
  const handleQtyChange = async (itemId, quantity) => {
    dispatch(localUpdateCartQty({ itemId, quantity }));

    if (isAuthenticated) {
      try {
        await api.put(`/users/cart/${itemId}`, { quantity });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Remove Item
  const handleRemove = async (itemId) => {
    dispatch(localRemoveFromCart(itemId));
    toast.success("Item removed from cart");

    if (isAuthenticated) {
      try {
        await api.put(`/users/cart/${itemId}`, { quantity: 0 });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Apply Coupon
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    if (!isAuthenticated) {
      toast.error("Please log in to apply coupons");
      router.push("/auth");
      return;
    }

    setIsValidatingCoupon(true);
    try {
      const res = await api.post("/coupons/validate", {
        code: couponInput.trim().toUpperCase(),
        cartSubtotal: subtotal
      });

      if (res.data.success) {
        dispatch(applyCouponCode(res.data.coupon));
        toast.success(`Coupon "${res.data.coupon.code}" applied! You saved ₹${res.data.discount}`);
        setCouponInput("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired coupon code");
      dispatch(removeCouponCode());
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error("Please log in to proceed to checkout");
      router.push("/auth");
    } else {
      router.push("/checkout");
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors min-h-[60vh]">
        <div className="border-b border-zinc-100 pb-6 dark:border-zinc-900 mb-8">
          <h1 className="text-xl font-extrabold uppercase tracking-wider">Your Shopping Bag</h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">Review items, apply coupons, and checkout</p>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900 mb-4">
              <IoCartOutline className="text-3xl text-zinc-400" />
            </div>
            <h3 className="text-sm font-bold uppercase">Your bag is empty</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 max-w-xs leading-relaxed">
              Explore our trending design catalogs and fill your bag with premium clothing, shoes, and accessories!
            </p>
            <Link
              href="/search"
              className="mt-6 rounded-full bg-black px-8 py-3 text-xs font-bold text-white uppercase tracking-wider dark:bg-white dark:text-black"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* CART ITEMS LIST */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="flex gap-4 p-4 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-900 dark:bg-zinc-950/40 shadow-sm transition-all"
                >
                  {/* Thumbnail */}
                  <Link href={`/product/${item.product?._id}`} className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-900">
                    <img
                      src={item.product?.images?.[0] || "https://placehold.co/100x120"}
                      alt={item.product?.title}
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <Link href={`/product/${item.product?._id}`}>
                          <h3 className="line-clamp-1 text-xs font-bold hover:text-black dark:hover:text-white">
                            {item.product?.title || "Fashion Product"}
                          </h3>
                        </Link>
                        <button
                          onClick={() => handleRemove(item._id)}
                          className="text-zinc-400 hover:text-red-500 transition-colors text-sm"
                        >
                          <IoTrashOutline />
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase mt-0.5">
                        Brand: {item.product?.brand || "Valois"}
                      </p>
                      <div className="flex gap-3 text-[10px] text-zinc-500 font-bold mt-1.5 uppercase">
                        <span>Size: {item.size || "Standard"}</span>
                        <span>Color: {item.color || "Default"}</span>
                      </div>
                    </div>

                    {/* Quantity modifier and Pricing */}
                    <div className="flex justify-between items-baseline mt-2">
                      <div className="flex border border-zinc-200 rounded-lg dark:border-zinc-800 overflow-hidden scale-90 origin-left">
                        <button
                          onClick={() => handleQtyChange(item._id, item.quantity - 1)}
                          className="h-7 w-7 flex items-center justify-center font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          −
                        </button>
                        <span className="h-7 w-9 flex items-center justify-center text-[11px] font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQtyChange(item._id, item.quantity + 1)}
                          className="h-7 w-7 flex items-center justify-center font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-extrabold">
                          ₹{(item.product?.salePrice || item.price || 0) * item.quantity}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                            (₹{item.product?.salePrice || item.price} each)
                          </span>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              ))}
            </div>

            {/* ORDER SUMMARY */}
            <div className="flex flex-col gap-6">
              
              {/* Promo code */}
              <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <IoGiftOutline className="text-amber-500" /> Apply Coupon
                </h3>
                {coupon ? (
                  <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs font-bold text-green-700 dark:bg-green-950/20 dark:border-green-900">
                    <span>{coupon.code} Applied</span>
                    <button
                      onClick={() => dispatch(removeCouponCode())}
                      className="text-[10px] font-extrabold uppercase hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ENTER CODE (e.g. WELCOME10)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-white dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={isValidatingCoupon}
                      className="rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-white dark:text-black text-xs font-bold px-4 py-2"
                    >
                      {isValidatingCoupon ? "Validating" : "Apply"}
                    </button>
                  </form>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b border-zinc-100 pb-4 dark:border-zinc-900 mb-4">
                  Pricing Summary
                </h3>

                <div className="flex flex-col gap-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  <div className="flex justify-between">
                    <span>Bag Subtotal</span>
                    <span className="text-zinc-900 dark:text-white">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes (GST 18%)</span>
                    <span className="text-zinc-900 dark:text-white">₹{gst}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Charges</span>
                    <span className="text-zinc-900 dark:text-white">
                      {shipping === 0 ? <span className="text-green-600 font-bold uppercase">Free</span> : `₹${shipping}`}
                    </span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Promo Coupon Discount</span>
                      <span>-₹{couponDiscount}</span>
                    </div>
                  )}

                  <hr className="border-zinc-100 dark:border-zinc-900 my-2" />

                  <div className="flex justify-between text-sm font-extrabold text-zinc-900 dark:text-white">
                    <span>Total Amount</span>
                    <span>₹{total}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="mt-6 w-full rounded-full bg-black py-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 flex items-center justify-center gap-2 transition-transform duration-200"
                >
                  <IoBagCheckOutline className="text-base" /> Proceed to Checkout
                </button>
              </div>

            </div>

          </div>
        )}

      </main>
      <Footer />
    </>
  );
};

export default CartPage;
