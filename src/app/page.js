"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { IoChevronForwardOutline, IoSparklesOutline, IoShieldCheckmarkOutline, IoFlameOutline } from "react-icons/io5";

import Navbar from "../components/Navbar.js";
import Footer from "../components/Footer.js";
import ProductCard from "../components/ProductCard.js";
import { ProductCardSkeleton } from "../components/Skeleton.js";
import api from "../utils/api.js";

export default function Home() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [trending, setTrending] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [faqOpen, setFaqOpen] = useState(null);

  const heroSlider = [
    {
      image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80",
      title: "Summer Haute Couture",
      subtitle: "Exclusive 50% Off On Selected Designer Wear",
      link: "/search?category=Women"
    },
    {
      image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
      title: "Dapper Classics For Men",
      subtitle: "Redefine Your Wardrobe Staples With Premium Materials",
      link: "/search?category=Men"
    }
  ];

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [catRes, trendRes, bestRes] = await Promise.all([
          api.get("/products/categories"),
          api.get("/products?trending=true&limit=4"),
          api.get("/products?bestSeller=true&limit=4")
        ]);

        if (catRes.data.success) setCategories(catRes.data.categories);
        if (trendRes.data.success) setTrending(trendRes.data.products);
        if (bestRes.data.success) setBestSellers(bestRes.data.products);
      } catch (err) {
        console.error("Home data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();

    // Auto rotate hero banner
    const heroLen = heroSlider.length;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroLen);
    }, 6000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testimonials = [
    { id: 1, name: "Aria Sharma", text: "The quality of fabrics is absolutely luxury. It fits perfectly and matches designer standard. The delivery was fast too!", role: "Model" },
    { id: 2, name: "Vikram Malhotra", text: "Truly premium shopping experience. Passwordless login is super convenient and Stripe payment was secure.", role: "Fashion Designer" },
    { id: 3, name: "Meera Patel", text: "Love their watches and bags collection! Got so many compliments at a wedding. Definitely a repeat customer.", role: "Entrepreneur" }
  ];

  const faqs = [
    { q: "How does the passwordless OTP login work?", a: "We value simplicity and security. You don't need passwords. Just enter your email or mobile, receive a 6-digit verification code, input it, and you're logged in. The code expires in 5 minutes." },
    { q: "What is your return and replacement policy?", a: "We offer a hassle-free 7-day return and replacement policy on all apparel. If you are unsatisfied, trigger a return from your profile. Once approved, the amount is instantly credited to your wallet." },
    { q: "Are the payment gateways secure?", a: "Yes, we integrate with industry-leading payment platforms (Stripe and Razorpay) using 256-bit SSL encryption. We also support Cash on Delivery (COD) and wallet payments." }
  ];

  return (
    <>
      <Navbar />
      
      {/* 1. HERO SLIDER */}
      <section className="relative h-[80vh] w-full overflow-hidden bg-zinc-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={heroIndex}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-black/35 z-10" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroSlider[heroIndex].image}
              alt={heroSlider[heroIndex].title}
              className="h-full w-full object-cover"
            />
            
            <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 sm:px-12 lg:px-24 max-w-4xl text-white">
              <motion.span
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xs font-bold uppercase tracking-widest text-zinc-300"
              >
                VALOIS LUXURY FASHION
              </motion.span>
              <motion.h1
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-tight"
              >
                {heroSlider[heroIndex].title}
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 text-sm sm:text-base text-zinc-200 font-medium max-w-lg"
              >
                {heroSlider[heroIndex].subtitle}
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8"
              >
                <Link
                  href={heroSlider[heroIndex].link}
                  className="rounded-full bg-white px-8 py-3.5 text-xs font-extrabold text-black uppercase tracking-wider transition-transform hover:scale-105 inline-flex items-center gap-2"
                >
                  Shop Collection <IoChevronForwardOutline />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Slider dots */}
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {heroSlider.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setHeroIndex(idx)}
              className={`h-2.5 rounded-full transition-all ${idx === heroIndex ? "w-8 bg-white" : "w-2.5 bg-white/40"}`}
            />
          ))}
        </div>
      </section>

      {/* 2. CATEGORY ACCORDION / SLIDER */}
      <section className="py-16 bg-white dark:bg-black transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center justify-center gap-2">
              <IoSparklesOutline className="text-amber-500" /> Explore Departments
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">Fine Apparel & Accessories Sorted Dynamically</p>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 w-32 flex-shrink-0 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
              ))
            ) : (
              categories.map((cat) => (
                <Link
                  key={cat._id}
                  href={`/search?category=${cat.name}`}
                  className="group relative h-48 w-36 flex-shrink-0 overflow-hidden rounded-2xl snap-start bg-zinc-50 dark:bg-zinc-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="absolute bottom-3 inset-x-0 text-center text-xs font-bold text-white uppercase tracking-wider">
                    {cat.name}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 3. BEST SELLERS */}
      <section className="py-16 bg-zinc-50 dark:bg-zinc-950/40 border-y border-zinc-100 dark:border-zinc-900 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <IoFlameOutline className="text-red-500" /> Best Sellers
              </h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">High-demand styles loved by customers</p>
            </div>
            <Link href="/search?bestSeller=true" className="text-xs font-extrabold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white uppercase tracking-wider flex items-center gap-1">
              View All <IoChevronForwardOutline />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            ) : (
              bestSellers.map((prod) => <ProductCard key={prod._id} product={prod} />)
            )}
          </div>
        </div>
      </section>

      {/* 4. BRAND PROMISE / SERVICE METRICS */}
      <section className="py-16 bg-white dark:bg-black transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 mb-4">
                <IoShieldCheckmarkOutline className="text-2xl" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">Secure Encrypted Payments</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed max-w-xs">
                We use tokenized integration endpoints for Stripe and Razorpay, ensuring PCI-DSS bank-grade payment security.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 mb-4">
                <IoSparklesOutline className="text-2xl" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">Premium Quality Fabrics</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed max-w-xs">
                All garments undergo strict inspections. Premium materials sourced globally for comfort and luxury look.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 mb-4">
                <IoFlameOutline className="text-2xl" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">Secure Delivery OTP</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed max-w-xs">
                Deliveries are protected by secure OTP codes, ensuring package delivery accuracy and preventing package thefts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TRENDING SECTION */}
      <section className="py-16 bg-zinc-50 dark:bg-zinc-950/40 border-y border-zinc-100 dark:border-zinc-900 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <IoSparklesOutline className="text-amber-500" /> Trending Now
              </h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">High-velocity styles of this season</p>
            </div>
            <Link href="/search?trending=true" className="text-xs font-extrabold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white uppercase tracking-wider flex items-center gap-1">
              View All <IoChevronForwardOutline />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            ) : (
              trending.map((prod) => <ProductCard key={prod._id} product={prod} />)
            )}
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="py-16 bg-white dark:bg-black transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-black uppercase tracking-wider text-zinc-900 dark:text-white">Customer Diaries</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">Real opinions from global shoppers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((test) => (
              <div key={test.id} className="flex flex-col justify-between p-6 rounded-3xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-900 dark:bg-zinc-950">
                <p className="text-xs italic text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  &quot;{test.text}&quot;
                </p>
                <div className="mt-6 flex items-center gap-3 border-t border-zinc-50 pt-4 dark:border-zinc-900">
                  <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-xs">
                    {test.name.substring(0, 1)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{test.name}</h4>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{test.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FAQ ACCORDION */}
      <section className="py-16 bg-zinc-50 border-t border-zinc-100 dark:bg-zinc-950 dark:border-zinc-900 transition-colors">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black uppercase tracking-wider text-zinc-900 dark:text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">Everything you need to know about the Valois shopping experience</p>
          </div>

          <div className="flex flex-col gap-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-2xl border border-zinc-100 bg-white overflow-hidden dark:border-zinc-900 dark:bg-zinc-950">
                <button
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left text-xs font-bold text-zinc-800 hover:text-black dark:text-zinc-200 dark:hover:text-white"
                >
                  <span>{faq.q}</span>
                  <span className="text-lg">{faqOpen === idx ? "−" : "+"}</span>
                </button>
                <AnimatePresence>
                  {faqOpen === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-50 px-6 py-4 dark:border-zinc-900"
                    >
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
