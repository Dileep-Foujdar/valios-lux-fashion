"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import {
  IoSearchOutline,
  IoHeartOutline,
  IoBagOutline,
  IoPersonOutline,
  IoMenuOutline,
  IoCloseOutline,
  IoSunnyOutline,
  IoMoonOutline,
  IoSettingsOutline,
  IoMicOutline,
  IoLogOutOutline
} from "react-icons/io5";
import toast from "react-hot-toast";

import { clearCredentials } from "../store/slices/authSlice.js";
import { clearCart } from "../store/slices/cartSlice.js";
import { clearWishlist } from "../store/slices/wishlistSlice.js";
import { updateThemePreference } from "../store/slices/settingsSlice.js";
import api from "../utils/api.js";

const Navbar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items) || [];
  const wishlistItems = useSelector((state) => state.wishlist.items) || [];
  const theme = useSelector((state) => state.settings.theme) || "system";

  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      if (theme === "dark") {
        setIsDark(true);
      } else if (theme === "light") {
        setIsDark(false);
      } else {
        setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
      }
    };
    checkTheme();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => setIsDark(mediaQuery.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  // Sync search input with URL search query if exists
  useEffect(() => {
    const q = searchParams.get("search");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q) setSearchQuery(q);
  }, [searchParams]);

  // Click outside listeners
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch search suggestions
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const fetchSuggestions = async () => {
        try {
          const res = await api.get(`/products?search=${searchQuery}&limit=5`);
          if (res.data.success) {
            setSuggestions(res.data.products);
            setShowSuggestions(true);
          }
        } catch (err) {
          console.error(err);
        }
      };
      const delayDebounce = setTimeout(fetchSuggestions, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    }
  };

  // Web Speech API Voice Search
  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice search is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast("Listening for search term...", { icon: "🎙️" });
    };

    recognition.onresult = (event) => {
      const resultText = event.results[0][0].transcript;
      setSearchQuery(resultText);
      toast.success(`Searching for: "${resultText}"`);
      router.push(`/search?search=${encodeURIComponent(resultText)}`);
    };

    recognition.onerror = (err) => {
      console.error("Speech recognition error:", err);
      setIsListening(false);
      toast.error("Voice search failed, try typing.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Toggle Theme
  const cycleTheme = () => {
    const themes = ["light", "dark", "system"];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    dispatch(updateThemePreference(nextTheme));
    toast.success(`Theme set to ${nextTheme}`);
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      dispatch(clearCredentials());
      dispatch(clearCart());
      dispatch(clearWishlist());
      toast.success("Logged out successfully");
      router.push("/");
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  const categories = [
    { name: "Men", link: "/search?category=Men" },
    { name: "Women", link: "/search?category=Women" },
    { name: "Kids", link: "/search?category=Kids" },
    { name: "Shoes", link: "/search?category=Shoes" },
    { name: "Watches", link: "/search?category=Watches" },
    { name: "Accessories", link: "/search?category=Accessories" },
    { name: "Bags", link: "/search?category=Bags" },
    { name: "Jewellery", link: "/search?category=Jewellery" },
    { name: "Beauty", link: "/search?category=Beauty" }
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-100 bg-white/80 backdrop-blur-md dark:border-zinc-900 dark:bg-black/80 transition-colors">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Mobile Menu Icon */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 lg:hidden"
        >
          <IoMenuOutline className="text-2xl" />
        </button>

        {/* LOGO */}
        <Link href="/" className="flex flex-col items-center">
          <span className="text-2xl font-black tracking-tighter text-black dark:text-white uppercase leading-none">
            VALOIS
          </span>
          <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">
            LUX FASHION
          </span>
        </Link>

        {/* Desktop Category Navigation Links */}
        <nav className="hidden lg:flex gap-6 xl:gap-8 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {categories.slice(0, 5).map((cat) => (
            <Link key={cat.name} href={cat.link} className="hover:text-black dark:hover:text-white transition-colors">
              {cat.name}
            </Link>
          ))}
        </nav>

        {/* SEARCH BAR */}
        <div ref={searchRef} className="relative hidden md:block w-72 lg:w-80 xl:w-96">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search designer fashion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2 pl-4 pr-16 text-xs font-medium outline-none transition-all focus:border-zinc-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-700 dark:focus:bg-zinc-950 dark:text-white"
            />
            <div className="absolute right-2.5 top-1.5 flex gap-1.5 items-center">
              <button
                type="button"
                onClick={startVoiceSearch}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 ${isListening ? "animate-ping text-red-500" : ""}`}
              >
                <IoMicOutline className="text-sm" />
              </button>
              <button
                type="submit"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-100"
              >
                <IoSearchOutline className="text-sm" />
              </button>
            </div>
          </form>

          {/* Search Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 right-0 mt-2 rounded-2xl border border-zinc-100 bg-white p-3 shadow-xl dark:border-zinc-900 dark:bg-zinc-950"
              >
                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase px-2 mb-2">Suggestions</p>
                <div className="flex flex-col gap-1.5">
                  {suggestions.map((prod) => (
                    <Link
                      key={prod._id}
                      href={`/product/${prod._id}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <div className="relative h-10 w-8 flex-shrink-0 overflow-hidden rounded-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={prod.images?.[0]} alt={prod.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">{prod.title}</h4>
                        <p className="text-[10px] text-zinc-500 font-medium">₹{prod.salePrice} | {prod.brand}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-1.5 sm:gap-3">

          {/* Theme Switcher */}
          <button
            onClick={cycleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {theme === "light" && <IoSunnyOutline className="text-xl" />}
            {theme === "dark" && <IoMoonOutline className="text-xl" />}
            {theme === "system" && <IoSettingsOutline className="text-xl" />}
          </button>

          {/* Wishlist Link */}
          <Link
            href="/wishlist"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <IoHeartOutline className="text-xl" />
            {wishlistItems.length > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {wishlistItems.length}
              </span>
            )}
          </Link>

          {/* Cart Link */}
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <IoBagOutline className="text-xl" />
            {cartItems.length > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white dark:bg-white dark:text-black">
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </Link>

          {/* Profile Dropdown */}
          <div ref={dropdownRef} className="relative">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  <span className="text-xs font-bold uppercase">{user?.name?.substring(0, 2)}</span>
                </button>
                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 rounded-2xl border border-zinc-100 bg-white p-2 shadow-xl dark:border-zinc-900 dark:bg-zinc-950"
                    >
                      <div className="border-b border-zinc-100 p-3 dark:border-zinc-900">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{user?.name}</p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{user?.email}</p>
                        <span className="inline-block mt-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                          {user?.role}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5 p-1">
                        {/* Dynamic Dashboard routing for roles */}
                        {["Admin", "Owner", "Super Admin"].includes(user?.role) && (
                          <Link
                            href="/admin"
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                          >
                            <IoSettingsOutline className="text-sm" /> Admin Panel
                          </Link>
                        )}
                        {user?.role === "Owner" && (
                          <Link
                            href="/owner"
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                          >
                            <IoSettingsOutline className="text-sm" /> Owner Dashboard
                          </Link>
                        )}
                        {user?.role === "Delivery Partner" && (
                          <Link
                            href="/delivery"
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                          >
                            <IoSettingsOutline className="text-sm" /> Delivery Panel
                          </Link>
                        )}

                        <Link
                          href="/profile"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          <IoPersonOutline className="text-sm" /> My Profile & Orders
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <IoLogOutOutline className="text-sm" /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <Link
                href="/auth"
                className="flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-xs font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Sign In
              </Link>
            )}
          </div>

        </div>
      </div>
    </header>

    {/* MOBILE DRAWER */}
    <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Overlay background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-50 mobile-overlay-bg"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col p-6 shadow-2xl mobile-drawer-bg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold uppercase tracking-tight text-black dark:text-white">VALOIS</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  <IoCloseOutline className="text-xl" />
                </button>
              </div>

              {/* Mobile Search */}
              <div className="mt-6">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    placeholder="Search clothing..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2 pl-4 pr-10 text-xs font-semibold outline-none focus:border-zinc-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-700 dark:text-white"
                  />
                  <button type="submit" className="absolute right-3 top-2.5 text-zinc-500">
                    <IoSearchOutline className="text-sm" />
                  </button>
                </form>
              </div>

              {/* Mobile Links */}
              <div className="mt-8 flex flex-col gap-4 text-sm font-bold text-zinc-800 dark:text-zinc-200" >
                {categories.map((cat) => (
                  <Link
                    key={cat.name}
                    href={cat.link}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-black dark:hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
