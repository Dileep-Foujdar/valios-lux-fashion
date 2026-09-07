"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { IoMailOutline, IoLockClosedOutline, IoBicycleOutline } from "react-icons/io5";
import toast from "react-hot-toast";

import api from "../../../utils/api.js";
import { setCredentials } from "../../../store/slices/authSlice.js";

const DeliveryLoginPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();
  const { register: registerOtp, handleSubmit: handleOtp, reset: resetOtp } = useForm();

  useEffect(() => {
    if (isAuthenticated && user?.role === "Delivery Partner") {
      router.replace("/delivery");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const requestOtp = async ({ email: raw }) => {
    setSubmitting(true);
    try {
      const destination = String(raw).toLowerCase().trim();
      const res = await api.post("/delivery/auth/otp/request", {
        email: destination,
        purpose: "delivery_login"
      });
      if (res.data.success) {
        setEmail(destination);
        setStep("otp");
        setCountdown(60);
        resetOtp();
        toast.success("OTP sent to your email");
        if (res.data.devOtp) toast(`Dev OTP: ${res.data.devOtp}`, { duration: 8000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async ({ otp }) => {
    setSubmitting(true);
    try {
      const res = await api.post("/delivery/auth/otp/verify", {
        email,
        otp,
        purpose: "delivery_login"
      });
      if (res.data.success) {
        dispatch(
          setCredentials({
            user: res.data.user,
            token: res.data.token,
            refreshToken: res.data.refreshToken
          })
        );
        toast.success("Welcome back");
        router.push("/delivery");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(255,255,255,0.08), transparent), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(161,161,170,0.12), transparent)"
        }}
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="mb-10 flex items-center gap-3">
            <IoBicycleOutline className="text-3xl text-zinc-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Zentro</p>
              <h1 className="font-serif text-3xl tracking-tight">Partner Login</h1>
            </div>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSubmit(requestOtp)} className="space-y-5">
              <p className="text-sm text-zinc-400">Sign in with the email used for your delivery partner account.</p>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
                  <IoMailOutline /> Email
                </span>
                <input
                  type="email"
                  className="w-full border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm outline-none transition focus:border-zinc-500"
                  placeholder="partner@email.com"
                  {...register("email", { required: "Email is required" })}
                />
                {errors.email && <span className="mt-1 block text-xs text-red-400">{errors.email.message}</span>}
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-white py-3 text-sm font-medium tracking-wide text-black transition hover:bg-zinc-200 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtp(verifyOtp)} className="space-y-5">
              <p className="text-sm text-zinc-400">
                Enter the 6-digit code sent to <span className="text-zinc-200">{email}</span>
              </p>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
                  <IoLockClosedOutline /> OTP
                </span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-zinc-500"
                  placeholder="••••••"
                  {...registerOtp("otp", { required: true, minLength: 6, maxLength: 6 })}
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-white py-3 text-sm font-medium tracking-wide text-black transition hover:bg-zinc-200 disabled:opacity-50"
              >
                {submitting ? "Verifying…" : "Sign in"}
              </button>
              <button
                type="button"
                disabled={countdown > 0 || submitting}
                onClick={() => requestOtp({ email })}
                className="w-full text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-xs text-zinc-600 hover:text-zinc-400"
              >
                Use a different email
              </button>
            </form>
          )}

          <p className="mt-10 text-center text-sm text-zinc-500">
            New partner?{" "}
            <Link href="/delivery/register" className="text-zinc-200 underline-offset-4 hover:underline">
              Apply to deliver
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-zinc-600">
            Shopping instead?{" "}
            <Link href="/auth" className="hover:text-zinc-400">
              Customer login
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default DeliveryLoginPage;
