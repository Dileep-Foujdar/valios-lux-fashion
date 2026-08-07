"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useForm, useWatch } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  IoMailOutline,
  IoLockClosedOutline,
  IoPersonOutline,
  IoPhonePortraitOutline,
  IoLocationOutline,
  IoRefreshOutline
} from "react-icons/io5";
import toast from "react-hot-toast";

import api from "../../utils/api.js";
import { setCredentials, setLoading } from "../../store/slices/authSlice.js";
import { setCart } from "../../store/slices/cartSlice.js";
import { setWishlist } from "../../store/slices/wishlistSlice.js";
import Navbar from "../../components/Navbar.js";
import Footer from "../../components/Footer.js";

const normalizeMobile = (raw) => {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits;
};

const AuthPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [mode, setMode] = useState("login"); // login | register
  const [step, setStep] = useState("form"); // form | otp
  const [emailForOtp, setEmailForOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [registerSnapshot, setRegisterSnapshot] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors }
  } = useForm({
    defaultValues: { name: "", mobile: "", email: "" }
  });
  const {
    register: registerOtp,
    handleSubmit: handleSubmitOtp,
    reset: resetOtp
  } = useForm();

  const watchedEmail = useWatch({ control, name: "email", defaultValue: "" });

  useEffect(() => {
    if (isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const switchMode = (next) => {
    setMode(next);
    setStep("form");
    setLocationError("");
    setCountdown(0);
    resetOtp();
  };

  const finishAuth = (resUser, token, refreshToken, message) => {
    toast.success(message || "Success");
    dispatch(
      setCredentials({
        user: resUser,
        token,
        refreshToken
      })
    );
    if (resUser.cart) dispatch(setCart(resUser.cart));
    if (resUser.wishlist) dispatch(setWishlist(resUser.wishlist));

    if (["Admin", "Owner", "Super Admin"].includes(resUser.role)) {
      router.push("/admin");
    } else if (resUser.role === "Delivery Partner") {
      router.push("/delivery"); // partners should prefer /delivery/login
    } else {
      router.push("/");
    }
  };

  const requestLiveLocation = async () => {
    setLocating(true);
    setLocationError("");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Location is not supported on this device. Enter your city manually.");
      setLocationData({ permission: "unavailable" });
      setLocating(false);
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });

      const next = {
        permission: "granted",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      setLocationData(next);
      toast.success("Live location captured");
    } catch (err) {
      const denied = err?.code === 1;
      setLocationData({ permission: denied ? "denied" : "unavailable" });
      setLocationError(
        denied
          ? "Location permission denied. You can try again or enter your city/address manually."
          : "Could not fetch live location. Try again or enter your city/address manually."
      );
    } finally {
      setLocating(false);
    }
  };

  const buildLocationPayload = () => {
    const city = manualCity.trim();
    const address = manualAddress.trim();

    if (locationData?.permission === "granted" && typeof locationData.latitude === "number") {
      return {
        permission: "granted",
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        city: city || undefined,
        address: address || undefined
      };
    }

    if (city || address) {
      return {
        permission: "manual",
        city: city || undefined,
        address: address || undefined
      };
    }

    return null;
  };

  const onSubmitLogin = async (data) => {
    dispatch(setLoading(true));
    try {
      const email = data.email.toLowerCase().trim();
      const res = await api.post("/auth/otp/request", {
        purpose: "login",
        email
      });

      if (res.data.success) {
        toast.success(res.data.message);
        if (res.data.otp) {
          toast(`[DEV] OTP: ${res.data.otp}`, { icon: "🔑", duration: 15000 });
        }
        setEmailForOtp(email);
        setStep("otp");
        setCountdown(60);
        resetOtp();
      }
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "USER_NOT_FOUND") {
        toast.error("No account found. Switch to Create Account.");
        switchMode("register");
        setValue("email", data.email);
      } else {
        toast.error(err.response?.data?.message || "Failed to send OTP");
      }
    } finally {
      dispatch(setLoading(false));
    }
  };

  const onSubmitRegister = async (data) => {
    const mobile = normalizeMobile(data.mobile);
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }

    const location = buildLocationPayload();
    if (!location) {
      toast.error("Allow live location or enter your city/address manually");
      return;
    }

    dispatch(setLoading(true));
    try {
      const email = data.email.toLowerCase().trim();
      const payload = {
        purpose: "register",
        name: data.name.trim(),
        mobile,
        email,
        location
      };

      const res = await api.post("/auth/otp/request", payload);
      if (res.data.success) {
        toast.success(res.data.message);
        if (res.data.otp) {
          toast(`[DEV] OTP: ${res.data.otp}`, { icon: "🔑", duration: 15000 });
        }
        setRegisterSnapshot(payload);
        setEmailForOtp(email);
        setStep("otp");
        setCountdown(60);
        resetOtp();
      }
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "USER_EXISTS") {
        toast.error("Account already exists. Switch to Sign In.");
        switchMode("login");
        setValue("email", data.email);
      } else {
        toast.error(err.response?.data?.message || "Registration failed");
      }
    } finally {
      dispatch(setLoading(false));
    }
  };

  const onSubmitOtp = async (data) => {
    dispatch(setLoading(true));
    try {
      const res = await api.post("/auth/otp/verify", {
        email: emailForOtp,
        code: data.otp.trim()
      });

      if (res.data.success) {
        finishAuth(
          res.data.user,
          res.data.token,
          res.data.refreshToken,
          res.data.message
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    try {
      const payload =
        mode === "register" && registerSnapshot
          ? { ...registerSnapshot, purpose: "register" }
          : { purpose: "login", email: emailForOtp };

      const res = await api.post("/auth/otp/request", payload);
      if (res.data.success) {
        toast.success("New verification code sent");
        if (res.data.otp) {
          toast(`[DEV] OTP: ${res.data.otp}`, { icon: "🔑", duration: 15000 });
        }
        setCountdown(60);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Resend failed");
    }
  };

  const locationGranted =
    locationData?.permission === "granted" &&
    typeof locationData.latitude === "number";

  return (
    <>
      <Navbar />
      <main className="flex min-h-[70vh] items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950 transition-colors">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900/50 transition-colors"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Kirnya Logo" className="mb-3 h-12 w-auto object-contain" />
            <h1
              className="text-xl font-black uppercase tracking-widest"
              style={{
                background: "radial-gradient(circle at 20% 20%, #f97316 0%, #d946ef 40%, #8b5cf6 70%, #06b6d4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              Kirnya Access
            </h1>
            <p className="mt-1 text-xs font-medium text-zinc-400 dark:text-zinc-500">
              Passwordless email OTP authentication
            </p>
          </div>

          {step === "form" && (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  mode === "login"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  mode === "register"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "form" && mode === "login" && (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
              >
                <form onSubmit={handleSubmit(onSubmitLogin)} className="flex flex-col gap-5">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="name@domain.com"
                        {...register("email", {
                          required: "Email is required",
                          pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" }
                        })}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-white"
                      />
                      <IoMailOutline className="absolute left-4 top-3.5 text-lg text-zinc-400" />
                    </div>
                    {errors.email && (
                      <span className="mt-1 block text-[10px] font-medium text-red-500">
                        {errors.email.message}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-black py-3 text-xs font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    Send Login OTP
                  </button>
                </form>
              </motion.div>
            )}

            {step === "form" && mode === "register" && (
              <motion.div
                key="register-form"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
              >
                <form onSubmit={handleSubmit(onSubmitRegister)} className="flex flex-col gap-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Your full name"
                        {...register("name", {
                          required: "Full name is required",
                          minLength: { value: 2, message: "Enter your full name" }
                        })}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-white"
                      />
                      <IoPersonOutline className="absolute left-4 top-3.5 text-lg text-zinc-400" />
                    </div>
                    {errors.name && (
                      <span className="mt-1 block text-[10px] font-medium text-red-500">
                        {errors.name.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Mobile Number
                    </label>
                    <div className="flex overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <span className="flex items-center bg-zinc-100 px-3 text-xs font-bold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                        +91
                      </span>
                      <div className="relative flex-1">
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="9876543210"
                          {...register("mobile", {
                            required: "Mobile number is required",
                            validate: (v) =>
                              /^[6-9]\d{9}$/.test(normalizeMobile(v)) ||
                              "Enter a valid 10-digit Indian mobile"
                          })}
                          onChange={(e) => {
                            const next = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setValue("mobile", next, { shouldValidate: true });
                          }}
                          className="w-full bg-zinc-50 py-3 pl-10 pr-3 text-xs font-semibold outline-none dark:bg-zinc-900 dark:text-white"
                        />
                        <IoPhonePortraitOutline className="absolute left-3 top-3.5 text-lg text-zinc-400" />
                      </div>
                    </div>
                    {errors.mobile && (
                      <span className="mt-1 block text-[10px] font-medium text-red-500">
                        {errors.mobile.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="name@domain.com"
                        {...register("email", {
                          required: "Email is required",
                          pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" }
                        })}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-white"
                      />
                      <IoMailOutline className="absolute left-4 top-3.5 text-lg text-zinc-400" />
                    </div>
                    {errors.email && (
                      <span className="mt-1 block text-[10px] font-medium text-red-500">
                        {errors.email.message}
                      </span>
                    )}
                  </div>

                  <div className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-900">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          <IoLocationOutline className="text-sm" />
                          Current Location
                        </label>
                        <p className="mt-1 text-[11px] font-medium text-zinc-500">
                          Tap Location to share live GPS, or enter manually if denied.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={requestLiveLocation}
                        disabled={locating}
                        className="shrink-0 rounded-full bg-zinc-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-60 dark:bg-white dark:text-black"
                      >
                        {locating ? "Locating..." : locationGranted ? "Refresh" : "Location"}
                      </button>
                    </div>

                    {locationGranted && (
                      <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                        Live location saved: {locationData.latitude.toFixed(5)}, {locationData.longitude.toFixed(5)}
                      </p>
                    )}

                    {locationError && (
                      <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                        {locationError}
                      </p>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                      <input
                        type="text"
                        value={manualCity}
                        onChange={(e) => setManualCity(e.target.value)}
                        placeholder="City (manual fallback)"
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        placeholder="Area / address (optional)"
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-black py-3 text-xs font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    Continue · Verify Email OTP
                  </button>
                </form>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <div className="mb-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-center dark:border-zinc-900 dark:bg-zinc-900/50">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {mode === "register"
                      ? "Verify your email to create your account. OTP sent to"
                      : "Login OTP sent to"}
                  </p>
                  <p className="mt-1 break-all text-xs font-bold text-zinc-900 dark:text-white">
                    {emailForOtp || watchedEmail}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="mt-2.5 text-[10px] font-bold uppercase text-zinc-400 hover:text-black dark:text-zinc-500 dark:hover:text-white"
                  >
                    Go Back
                  </button>
                </div>

                <form onSubmit={handleSubmitOtp(onSubmitOtp)} className="flex flex-col gap-5">
                  <div>
                    <label className="mb-2 block text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Enter 6-digit OTP
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="######"
                        {...registerOtp("otp", {
                          required: true,
                          minLength: 6,
                          maxLength: 6
                        })}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-center text-sm font-bold tracking-[0.4em] outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-white"
                      />
                      <IoLockClosedOutline className="absolute left-4 top-3.5 text-lg text-zinc-400" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-black py-3 text-xs font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    {mode === "register" ? "Verify & Create Account" : "Verify & Sign In"}
                  </button>

                  <div className="text-center">
                    {countdown > 0 ? (
                      <span className="text-[10px] font-semibold uppercase text-zinc-400">
                        Resend code in {countdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-900 hover:underline dark:text-white"
                      >
                        <IoRefreshOutline className="text-sm" />
                        Resend Verification Code
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center text-[11px] text-zinc-500">
            Delivery partner?{" "}
            <a href="/delivery/login" className="font-semibold text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200">
              Partner login
            </a>
          </div>

          <div className="mt-4 text-center text-[10px] font-medium leading-relaxed text-zinc-400 dark:text-zinc-500">
            By continuing, you agree to Kirnya&apos;s Terms of Service and Privacy Policy.
            OTP expires in 5 minutes.
          </div>
        </motion.div>
      </main>
      <Footer />
    </>
  );
};

export default AuthPage;
