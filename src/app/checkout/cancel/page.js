"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { IoCloseCircleOutline, IoCardOutline } from "react-icons/io5";

import Navbar from "../../../components/Navbar.js";
import Footer from "../../../components/Footer.js";

const CancelPage = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-16 bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors min-h-[70vh] flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center text-center p-8 border border-zinc-100 rounded-3xl dark:border-zinc-900 bg-zinc-50/20"
        >
          <IoCloseCircleOutline className="text-5xl text-red-500 mb-4 animate-pulse" />
          <h2 className="text-base font-bold uppercase tracking-wider">Payment Cancelled</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 leading-relaxed">
            Your card transaction was aborted or failed. Your shopping items are saved in your order history, and you can retry paying at any time.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full">
            <Link
              href="/profile"
              className="flex-1 rounded-full bg-black py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-center transition-colors flex items-center justify-center gap-1.5"
            >
              <IoCardOutline /> Retry Payment
            </Link>
            <Link
              href="/cart"
              className="flex-1 rounded-full border border-zinc-200 py-3 text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 text-center transition-colors"
            >
              Return to Bag
            </Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </>
  );
};

export default CancelPage;
