"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { IoMailOutline, IoCallOutline, IoKeyOutline, IoLockClosedOutline } from "react-icons/io5";
import toast from "react-hot-toast";

import api from "../../utils/api.js";
import { setCredentials, setLoading } from "../../store/slices/authSlice.js";
import Navbar from "../../components/Navbar.js";
import Footer from "../../components/Footer.js";

const AuthPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [authMethod, setAuthMethod] = useState("email"); // email or mobile
  const [step, setStep] = useState(1); // 1: request, 2: verify
  const [destinationValue, setDestinationValue] = useState("");
  const [countdown, setCountdown] = useState(0);

  const { register, handleSubmit, formState: { errors } } = useForm();
  const { register: registerOtp, handleSubmit: handleSubmitOtp } = useForm();

  // If already authenticated, redirect to home
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // 1. Request OTP
  const onSubmitDestination = async (data) => {
    dispatch(setLoading(true));
    try {
      const payload = authMethod === "email" 
        ? { email: data.email.toLowerCase().trim() } 
        : { mobile: data.mobile.trim() };
      
      const destination = authMethod === "email" ? data.email : data.mobile;
      setDestinationValue(destination);

      const res = await api.post("/auth/otp/request", payload);
      if (res.data.success) {
        toast.success(res.data.message);
        setStep(2);
        setCountdown(60); // 60s cooldown
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP. Try again.");
    } finally {
      dispatch(setLoading(false));
    }
  };

  // 2. Verify OTP and login
  const onSubmitOtp = async (data) => {
    dispatch(setLoading(true));
    try {
      const payload = authMethod === "email"
        ? { email: destinationValue.toLowerCase().trim(), code: data.otp.trim() }
        : { mobile: destinationValue.trim(), code: data.otp.trim() };

      const res = await api.post("/auth/otp/verify", payload);
      if (res.data.success) {
        toast.success(res.data.message);
        
        // Save in Redux
        dispatch(setCredentials({
          user: res.data.user,
          token: res.data.token,
          refreshToken: res.data.refreshToken
        }));

        // Redirect based on role
        if (["Admin", "Owner", "Super Admin"].includes(res.data.user.role)) {
          router.push("/admin");
        } else if (res.data.user.role === "Delivery Partner") {
          router.push("/delivery");
        } else {
          router.push("/profile");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      const payload = authMethod === "email"
        ? { email: destinationValue.toLowerCase().trim() }
        : { mobile: destinationValue.trim() };
      
      const res = await api.post("/auth/otp/request", payload);
      if (res.data.success) {
        toast.success("New verification code sent!");
        setCountdown(60);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Resend failed.");
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex min-h-[70vh] items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950 transition-colors">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-3xl border border-zinc-100 bg-white p-8 shadow-xl dark:border-zinc-900 dark:bg-black/40"
        >
          <div className="text-center mb-8">
            <h1 className="text-xl font-extrabold uppercase tracking-widest text-zinc-900 dark:text-white">
              VALOIS Access Portal
            </h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">
              Secure Passwordless Authentication
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                {/* Method selector */}
                <div className="flex rounded-full bg-zinc-100 p-1 mb-6 dark:bg-zinc-900">
                  <button
                    onClick={() => setAuthMethod("email")}
                    className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${authMethod === "email" ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white" : "text-zinc-400 dark:text-zinc-500"}`}
                  >
                    Email Address
                  </button>
                  <button
                    onClick={() => setAuthMethod("mobile")}
                    className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${authMethod === "mobile" ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white" : "text-zinc-400 dark:text-zinc-500"}`}
                  >
                    Mobile Number
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmitDestination)} className="flex flex-col gap-5">
                  {authMethod === "email" ? (
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block">
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          placeholder="name@domain.com"
                          {...register("email", { required: true, pattern: /^\S+@\S+$/i })}
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-white dark:text-white"
                        />
                        <IoMailOutline className="absolute left-4 top-3.5 text-zinc-400 text-lg" />
                      </div>
                      {errors.email && (
                        <span className="text-[10px] text-red-500 font-medium mt-1 block">Please enter a valid email address</span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          placeholder="+91 XXXXX XXXXX"
                          {...register("mobile", { required: true, pattern: /^\+?[1-9]\d{1,14}$/ })}
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-white dark:text-white"
                        />
                        <IoCallOutline className="absolute left-4 top-3.5 text-zinc-400 text-lg" />
                      </div>
                      {errors.mobile && (
                        <span className="text-[10px] text-red-500 font-medium mt-1 block">Please enter mobile with country code (e.g. +91)</span>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-black py-3 text-xs font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    Request Verification Code
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <div className="mb-6 rounded-2xl bg-zinc-50 p-4 border border-zinc-100 text-center dark:bg-zinc-900/50 dark:border-zinc-900">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    A 6-digit OTP code has been sent to
                  </p>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white mt-1 break-all">
                    {destinationValue}
                  </p>
                  <button
                    onClick={() => setStep(1)}
                    className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-white uppercase mt-2.5"
                  >
                    Change Destination
                  </button>
                </div>

                <form onSubmit={handleSubmitOtp(onSubmitOtp)} className="flex flex-col gap-5">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block text-center">
                      Enter Verification Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="######"
                        {...registerOtp("otp", { required: true, minLength: 6 })}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-center text-sm font-bold tracking-[0.4em] pl-4 outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-white dark:text-white"
                      />
                      <IoLockClosedOutline className="absolute left-4 top-3.5 text-zinc-400 text-lg" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-black py-3 text-xs font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    Confirm & Sign In
                  </button>

                  <div className="text-center mt-2">
                    {countdown > 0 ? (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase">
                        Resend Code in {countdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        className="text-[10px] font-bold text-zinc-900 dark:text-white hover:underline uppercase tracking-wider"
                      >
                        Resend Verification Code
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legal / Policy note */}
          <div className="mt-8 text-center text-[10px] text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed">
            By signing in, you agree to VALOIS&apos;s <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>. We do not distribute spam.
          </div>
        </motion.div>
      </main>
      <Footer />
    </>
  );
};

export default AuthPage;
