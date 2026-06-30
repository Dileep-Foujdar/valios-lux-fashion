"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSelector, useDispatch } from "react-redux";
import { IoHeartOutline } from "react-icons/io5";

import Navbar from "../../components/Navbar.js";
import Footer from "../../components/Footer.js";
import ProductCard from "../../components/ProductCard.js";
import { setWishlist } from "../../store/slices/wishlistSlice.js";
import api from "../../utils/api.js";

const WishlistPage = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const wishlistItems = useSelector((state) => state.wishlist.items) || [];
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchWishlist = async () => {
        setLoading(true);
        try {
          const res = await api.get("/users/profile");
          if (res.data.success) {
            dispatch(setWishlist(res.data.user.wishlist || []));
          }
        } catch (err) {
          console.error("Wishlist sync error:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchWishlist();
    }
  }, [isAuthenticated, dispatch]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors min-h-[60vh]">
        <div className="border-b border-zinc-100 pb-6 dark:border-zinc-900 mb-8">
          <h1 className="text-xl font-extrabold uppercase tracking-wider">Your Wishlist</h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">Saved items you are keeping an eye on</p>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900 mb-4">
              <IoHeartOutline className="text-3xl text-zinc-400" />
            </div>
            <h3 className="text-sm font-bold uppercase">Wishlist is empty</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 max-w-xs leading-relaxed">
              Browse our collections and tap the heart icon on products that catch your eye. They&apos;ll save here!
            </p>
            <Link
              href="/search"
              className="mt-6 rounded-full bg-black px-8 py-3 text-xs font-bold text-white uppercase tracking-wider dark:bg-white dark:text-black"
            >
              Start Exploring
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {wishlistItems.map((prod) => (
              <ProductCard key={prod._id} product={prod} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default WishlistPage;
