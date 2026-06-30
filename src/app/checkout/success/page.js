"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { IoCheckmarkCircle, IoBagHandleOutline, IoAlertCircleOutline } from "react-icons/io5";

import Navbar from "../../../components/Navbar.js";
import Footer from "../../../components/Footer.js";
import api from "../../../utils/api.js";

const SuccessPage = () => {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const orderId = searchParams.get("orderId");
  const gateway = searchParams.get("gateway");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const confirmPaymentAndLoadOrder = async () => {
      if (!orderId) {
        setError("Invalid request parameters.");
        setLoading(false);
        return;
      }

      try {
        // If Stripe session ID is present, verify payment first
        if (gateway === "stripe" && sessionId) {
          await api.post("/payments/verify", {
            gateway: "stripe",
            orderId,
            stripeSessionId: sessionId
          });
        }

        // Fetch Order Details
        const res = await api.get(`/orders/${orderId}`);
        if (res.data.success) {
          setOrder(res.data.order);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to verify order details. Please check your profile order history.");
      } finally {
        setLoading(false);
      }
    };

    confirmPaymentAndLoadOrder();
  }, [orderId, gateway, sessionId]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors min-h-[70vh] flex flex-col justify-center">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <div className="h-10 w-10 border-4 border-black border-t-transparent dark:border-white rounded-full animate-spin"></div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Verifying Transaction...</p>
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center p-8 border border-red-100 rounded-3xl dark:border-red-950/20 bg-red-50/10"
          >
            <IoAlertCircleOutline className="text-5xl text-red-500 mb-4" />
            <h2 className="text-base font-bold uppercase">Payment Verification Error</h2>
            <p className="text-xs text-zinc-500 mt-2 max-w-sm leading-relaxed">{error}</p>
            <Link
              href="/profile"
              className="mt-6 rounded-full bg-black px-6 py-2.5 text-xs font-bold text-white uppercase dark:bg-white dark:text-black"
            >
              Go to Order History
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-8"
          >
            
            {/* Animated Header */}
            <div className="text-center flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="text-6xl text-emerald-500 mb-4"
              >
                <IoCheckmarkCircle />
              </motion.div>
              <h1 className="text-2xl font-black uppercase tracking-wider">Order Confirmed</h1>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">
                Your order #{order?.orderNumber} has been successfully created.
              </p>
            </div>

            {/* Order Summary Card */}
            <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
              <h3 className="text-xs font-bold uppercase tracking-wider border-b border-zinc-100 pb-4 dark:border-zinc-900 mb-4">
                Delivery Details
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <div>
                  <h4 className="text-zinc-900 dark:text-white mb-1">Customer Name</h4>
                  <p>{order?.shippingAddress?.name}</p>
                </div>
                <div>
                  <h4 className="text-zinc-900 dark:text-white mb-1">Contact Phone</h4>
                  <p>{order?.shippingAddress?.phone}</p>
                </div>
                <div className="sm:col-span-2">
                  <h4 className="text-zinc-900 dark:text-white mb-1">Shipping Address</h4>
                  <p>{order?.shippingAddress?.street}, {order?.shippingAddress?.city}, {order?.shippingAddress?.state} - {order?.shippingAddress?.zipCode}</p>
                </div>
                <div>
                  <h4 className="text-zinc-900 dark:text-white mb-1">Payment Method</h4>
                  <p className="uppercase">{order?.paymentMethod} ({order?.paymentStatus === 'Paid' ? 'PAID' : 'PENDING COD'})</p>
                </div>
                <div>
                  <h4 className="text-zinc-900 dark:text-white mb-1">Total Pricing</h4>
                  <p className="text-zinc-900 dark:text-white font-extrabold text-sm">₹{order?.pricing?.total}</p>
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Link
                href="/profile"
                className="w-full sm:w-auto rounded-full bg-black py-3.5 px-8 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-center transition-colors flex items-center justify-center gap-2"
              >
                <IoBagHandleOutline className="text-base" /> View My Orders
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto rounded-full border border-zinc-200 py-3.5 px-8 text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 text-center transition-colors"
              >
                Continue Shopping
              </Link>
            </div>

          </motion.div>
        )}

      </main>
      <Footer />
    </>
  );
};

export default SuccessPage;
