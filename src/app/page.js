"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  IoArrowForward,
  IoRefreshOutline,
  IoAirplaneOutline,
  IoShieldCheckmarkOutline,
  IoSparklesOutline,
  IoLeafOutline,
  IoCutOutline,
  IoHeartOutline
} from "react-icons/io5";

import Navbar from "../components/Navbar.js";
import Footer from "../components/Footer.js";
import ProductCard from "../components/ProductCard.js";
import { ProductCardSkeleton } from "../components/Skeleton.js";
import api from "../utils/api.js";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=2000&q=80";

const COLLECTION_PANELS = [
  {
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    label: "Women",
    href: "/search?category=Women"
  },
  {
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
    label: "Men",
    href: "/search?category=Men"
  },
  {
    image: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=800&q=80",
    label: "Kids",
    href: "/search?category=Kids"
  },
  {
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
    label: "Home",
    href: "/search?category=Home%20%26%20Kitchen"
  }
];

const MOMENTS = [
  {
    image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80",
    title: "Soft & Breathable Fabrics"
  },
  {
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    title: "Finest Craftsmanship"
  },
  {
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    title: "Perfect for Every Occasion"
  }
];

const PILLARS = [
  { icon: IoLeafOutline, label: "Premium Fabric" },
  { icon: IoCutOutline, label: "Elegant Designs" },
  { icon: IoHeartOutline, label: "All-Day Comfort" },
  { icon: IoSparklesOutline, label: "Easy Care" }
];

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
};

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      try {
        const [catRes, newRes, featRes, allRes] = await Promise.all([
          api.get("/products/categories"),
          api.get("/products?newArrival=true&limit=8&sort=-createdAt"),
          api.get("/products?featured=1&limit=8&sort=featured"),
          api.get("/products?limit=8&sort=-createdAt")
        ]);
        if (cancelled) return;
        if (catRes.data.success) setCategories(catRes.data.categories || []);
        if (newRes.data.success) setNewArrivals(newRes.data.products || []);
        if (featRes.data.success) setFeatured(featRes.data.products || []);
        if (allRes.data.success && !(newRes.data.products || []).length) {
          setNewArrivals(allRes.data.products || []);
        }      } catch (err) {
        console.error("Home data fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryCircles = categories;

  return (
    <>
      <Navbar />

      {/* ── HERO: one composition, brand-first, full-bleed ── */}
      <section className="relative min-h-[100svh] w-full overflow-hidden bg-zinc-950 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt="Zentro collection"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-16 pt-28 sm:px-8 sm:pb-20 lg:justify-center lg:px-10 lg:pb-24">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-5xl font-semibold tracking-[0.08em] text-white sm:text-6xl md:text-7xl lg:text-8xl"
          >
            ZENTRO
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12 }}
            className="mt-3 max-w-xl font-display text-3xl font-medium leading-tight text-zinc-100 sm:text-4xl md:text-5xl"
          >
            Every You
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mt-4 max-w-md text-sm leading-relaxed text-zinc-300 sm:text-base"
          >
            Men, women, kids, home, beauty & more — shop everything in one place.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.32 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/search"
              className="btn-brand px-7 py-3.5 text-[11px] tracking-[0.2em]"
            >
              Shop All <IoArrowForward className="text-sm" />
            </Link>
            <Link
              href="/search?category=Men"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 underline-offset-4 transition hover:text-white hover:underline"
            >
              Men
            </Link>
            <Link
              href="/search?category=Women"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 underline-offset-4 transition hover:text-white hover:underline"
            >
              Women
            </Link>
            <Link
              href="/search?category=Kids"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 underline-offset-4 transition hover:text-white hover:underline"
            >
              Kids
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-900 dark:bg-black">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-zinc-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-zinc-900">
          {[
            { icon: IoRefreshOutline, title: "Easy Returns", sub: "7-day hassle-free exchange" },
            { icon: IoAirplaneOutline, title: "Free Shipping", sub: "On orders above ₹999" },
            { icon: IoShieldCheckmarkOutline, title: "Secure Checkout", sub: "COD · Razorpay · Wallet" }
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 px-6 py-5">
              <item.icon className="text-xl text-zinc-700 dark:text-zinc-300" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white">
                  {item.title}
                </p>
                <p className="text-[11px] text-zinc-500">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Explore The Products — 4-panel strip */}
      <section className="bg-[#f4f2ef] py-16 dark:bg-zinc-950 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <motion.div {...fadeUp} className="mb-10 text-center">
            <h2 className="font-script text-4xl text-zinc-800 dark:text-zinc-100 sm:text-5xl md:text-6xl">
              Explore The Products
            </h2>
            <p className="mt-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
              Women · Men · Kids · Home
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="relative overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-1 md:grid-cols-4 md:gap-0">
              {COLLECTION_PANELS.map((panel, i) => (
                <Link
                  key={panel.label}
                  href={panel.href}
                  className="group relative aspect-[3/4] overflow-hidden bg-zinc-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={panel.image}
                    alt={panel.label}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/25" />
                  <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white opacity-0 transition group-hover:opacity-100">
                    {panel.label}
                  </span>
                  {i === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center md:hidden">
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white drop-shadow">
                        Artisanal looks
                      </p>
                    </div>
                  )}
                </Link>
              ))}
            </div>

            {/* Desktop centered copy over strip */}
            <div className="pointer-events-none absolute inset-0 hidden items-center justify-center md:flex">
              <div className="bg-black/35 px-10 py-8 text-center text-white backdrop-blur-[2px]">
                <p className="text-2xl font-semibold uppercase tracking-[0.12em] sm:text-3xl">
                  Global Style, Every Day
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.22em] text-white/80">
                  Artisanal pieces for every adventure
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-center md:absolute md:bottom-6 md:right-6 md:mt-0 md:justify-end">
              <Link
                href="/search"
                className="btn-brand pointer-events-auto px-6 py-3 text-[10px] tracking-[0.2em]"
              >
                Shop The Collection <IoArrowForward />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Timeless elegance split */}
      <section className="bg-white py-16 dark:bg-black sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-10">
          <motion.div {...fadeUp} className="lg:col-span-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
              New Collection
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium leading-snug text-zinc-900 dark:text-white sm:text-4xl">
              Timeless elegance for every you
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Graceful styles. Premium comfort. Celebrate every moment in pure elegance.
            </p>
            <Link
              href="/search?newArrival=true"
              className="btn-brand mt-8 px-6 py-3 text-[10px] tracking-[0.2em]"
            >
              Shop Now <IoArrowForward />
            </Link>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2">
              {PILLARS.map((p) => (
                <div key={p.label} className="flex flex-col items-start gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800">
                    <p.icon className="text-lg text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} className="relative lg:col-span-5">
            <div className="aspect-[4/5] overflow-hidden bg-zinc-100 dark:bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80"
                alt="Zentro new collection"
                className="h-full w-full object-cover"
              />
            </div>
          </motion.div>

          <motion.div {...fadeUp} className="lg:col-span-3">
            <p className="font-display text-xl text-zinc-900 dark:text-white">
              Made for every moment
            </p>
            <ul className="mt-8 space-y-6">
              {MOMENTS.map((m) => (
                <li key={m.title} className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {m.title}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Celebrate — category circles */}
      <section className="border-y border-zinc-100 bg-[#f4f2ef] py-16 dark:border-zinc-900 dark:bg-zinc-950 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="font-script text-4xl text-zinc-800 dark:text-zinc-100 sm:text-5xl">
              Celebrate
            </h2>
            <p className="mt-2 text-xs uppercase tracking-[0.22em] text-zinc-500">
              Shop by department
            </p>
          </motion.div>

          <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-5 sm:gap-6 md:grid-cols-5 lg:grid-cols-10 sm:overflow-visible">
            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex w-28 shrink-0 flex-col items-center gap-3 sm:w-auto">
                    <div className="aspect-square w-full animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-3 w-16 animate-pulse bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                ))
              : categoryCircles.map((cat) => (
                  <Link
                    key={cat._id || cat.name}
                    href={`/search?category=${encodeURIComponent(cat.name)}`}
                    className="group flex w-28 shrink-0 flex-col items-center gap-3 sm:w-auto"
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-full border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          cat.image ||
                          `https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=400&q=80`
                        }
                        alt={cat.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                      />
                    </div>
                    <span className="text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-700 group-hover:text-black dark:text-zinc-300 dark:group-hover:text-white">
                      {cat.name}
                    </span>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="bg-white py-16 dark:bg-black sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-script text-3xl text-zinc-800 dark:text-zinc-100 sm:text-4xl">
                Just In
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                New arrivals
              </p>
            </div>
            <Link
              href="/search?newArrival=true&sort=-createdAt"
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
            >
              View all <IoArrowForward />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : newArrivals.length > 0
                ? newArrivals.map((p) => <ProductCard key={p._id} product={p} />)
                : featured.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/search"
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
            >
              Browse all products <IoArrowForward />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured strip CTA */}
      <section className="relative overflow-hidden bg-zinc-950 py-20 text-white sm:py-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1800&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-black/50" />
        <motion.div
          {...fadeUp}
          className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-8"
        >
          <p className="font-script text-4xl sm:text-5xl">Made for Every You</p>
          <p className="mx-auto mt-4 max-w-lg text-sm text-zinc-300">
            Soft fabrics, careful cuts, and silhouettes that move with your day — from morning errands to evening light.
          </p>
          <Link
            href="/search?featured=1"
            className="btn-brand-accent mt-8 px-8 py-3.5 text-[11px] tracking-[0.2em]"
          >
            Shop Featured <IoArrowForward />
          </Link>
        </motion.div>
      </section>

      {/* Featured products */}
      {(featured.length > 0 || loading) && (
        <section className="bg-white py-16 dark:bg-black sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-script text-3xl text-zinc-800 dark:text-zinc-100 sm:text-4xl">
                  Featured
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Editor&apos;s picks
                </p>
              </div>
              <Link
                href="/search?featured=1"
                className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
              >
                View all <IoArrowForward />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : featured.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}
