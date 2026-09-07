"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import {
  IoNotificationsOutline,
  IoLocationOutline,
  IoPhonePortraitOutline,
  IoShieldCheckmarkOutline
} from "react-icons/io5";
import toast from "react-hot-toast";

import api from "../utils/api.js";
import { updateUser } from "../store/slices/authSlice.js";

const normalizeMobile = (raw) => {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits;
};

const isValidIndianMobile = (value) => /^[6-9]\d{9}$/.test(normalizeMobile(value));

/**
 * After customer login:
 * 1) Collect compulsory mobile number
 * 2) Ask browser notification permission
 * 3) Ask browser location permission
 * Persist all results on the user document.
 */
const PermissionOnboarding = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [hydrated, setHydrated] = useState(false);
  const [stepOverride, setStepOverride] = useState(null); // mobile | permissions | null
  const [mobile, setMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");

  const needsOnboarding = useMemo(() => {
    if (!isAuthenticated || !user) return false;
    // Staff roles skip customer permission gate
    if (["Admin", "Owner", "Super Admin", "Delivery Partner"].includes(user.role)) {
      return false;
    }
    // New registration already collects name/mobile/location + email OTP.
    // Only gate legacy accounts missing compulsory mobile (or unfinished setup).
    const missingMobile = !normalizeMobile(user.mobile);
    const incomplete = !user.permissionsOnboardingCompleted && missingMobile;
    return missingMobile || incomplete;
  }, [isAuthenticated, user]);

  const derivedStep = !user
    ? null
    : !normalizeMobile(user.mobile)
      ? "mobile"
      : !user.permissionsOnboardingCompleted
        ? "permissions"
        : null;
  const step = stepOverride || derivedStep || "mobile";

  // Sync latest profile flags after login / page reload
  useEffect(() => {
    let cancelled = false;

    const syncProfile = async () => {
      if (!isAuthenticated) {
        setHydrated(true);
        return;
      }
      try {
        const res = await api.get("/users/profile");
        if (!cancelled && res.data?.success && res.data.user) {
          const u = res.data.user;
          dispatch(
            updateUser({
              mobile: u.mobile || "",
              notifications: u.notifications,
              location: u.location,
              permissionsOnboardingCompleted: Boolean(u.permissionsOnboardingCompleted),
              name: u.name,
              email: u.email,
              role: u.role,
              walletBalance: u.walletBalance,
              referralCode: u.referralCode
            })
          );
          setMobile(normalizeMobile(u.mobile) || "");
          setStepOverride(null);
        }
      } catch {
        // Keep local auth state if profile fetch fails
        if (!cancelled && user) {
          setMobile(normalizeMobile(user.mobile) || "");
          setStepOverride(null);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };

    queueMicrotask(() => {
      if (!cancelled) void syncProfile();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (!hydrated || !needsOnboarding) return null;

  const saveMobile = async (e) => {
    e.preventDefault();
    const normalized = normalizeMobile(mobile);
    if (!isValidIndianMobile(normalized)) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/users/permissions", { mobile: normalized });
      if (res.data.success) {
        dispatch(updateUser(res.data.user));
        toast.success("Mobile number saved");
        setStepOverride("permissions");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save mobile number");
    } finally {
      setSaving(false);
    }
  };

  const requestNotifications = async () => {
    setBusyAction("notifications");
    try {
      let permission = "denied";
      if (typeof window !== "undefined" && "Notification" in window) {
        permission = await Notification.requestPermission();
      } else {
        permission = "denied";
        toast.error("Notifications are not supported in this browser");
      }

      const enabled = permission === "granted";
      if (enabled) {
        try {
          new Notification("Zentro", {
            body: "Notifications enabled. We'll keep you updated on orders & offers.",
            icon: "/favicon.png?v=5"
          });
        } catch {
          // Some browsers block Notification constructor without service worker
        }
      }

      const res = await api.put("/users/permissions", {
        notifications: {
          permission,
          enabled,
          askedAt: new Date().toISOString()
        }
      });
      if (res.data.success) {
        dispatch(updateUser(res.data.user));
        toast.success(enabled ? "Notifications allowed" : "Notification preference saved");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save notification preference");
    } finally {
      setBusyAction("");
    }
  };

  const requestLocation = async () => {
    setBusyAction("location");
    try {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        const res = await api.put("/users/permissions", {
          location: { permission: "unavailable" }
        });
        if (res.data.success) dispatch(updateUser(res.data.user));
        toast.error("Location is not available on this device");
        return;
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });

      const res = await api.put("/users/permissions", {
        location: {
          permission: "granted",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
      });
      if (res.data.success) {
        dispatch(updateUser(res.data.user));
        toast.success("Location saved");
      }
    } catch (geoErr) {
      const denied = geoErr?.code === 1;
      try {
        const res = await api.put("/users/permissions", {
          location: { permission: denied ? "denied" : "unavailable" }
        });
        if (res.data.success) dispatch(updateUser(res.data.user));
      } catch {
        // ignore secondary save failure
      }
      toast.error(denied ? "Location permission denied" : "Could not fetch location");
    } finally {
      setBusyAction("");
    }
  };

  const finishOnboarding = async () => {
    if (!normalizeMobile(user?.mobile || mobile)) {
      toast.error("Mobile number is compulsory");
      setStepOverride("mobile");
      return;
    }

    setBusyAction("finish");
    try {
      // Ensure we asked at least once; if user skipped browser prompts, store defaults
      const payload = {
        completeOnboarding: true
      };

      if (!user?.notifications?.askedAt) {
        payload.notifications = {
          permission:
            typeof window !== "undefined" && "Notification" in window
              ? Notification.permission
              : "denied",
          enabled:
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted",
          askedAt: new Date().toISOString()
        };
      }

      if (!user?.location?.permission || user.location.permission === "prompt") {
        payload.location = { permission: "denied" };
      }

      const res = await api.put("/users/permissions", payload);
      if (res.data.success) {
        dispatch(updateUser(res.data.user));
        toast.success("You're all set!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not finish setup");
    } finally {
      setBusyAction("");
    }
  };

  const notifDone = Boolean(user?.notifications?.askedAt) || user?.notifications?.permission === "granted";
  const locDone =
    user?.location?.permission &&
    ["granted", "denied", "unavailable"].includes(user.location.permission);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900">
              <IoShieldCheckmarkOutline className="text-xl text-zinc-700 dark:text-zinc-200" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Complete your account
              </h2>
              <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Mobile is required. Please also allow notifications and location for order updates.
              </p>
            </div>
          </div>

          {step === "mobile" ? (
            <form onSubmit={saveMobile} className="flex flex-col gap-4">
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <IoPhonePortraitOutline className="text-sm" />
                  Mobile number <span className="text-red-500">*</span>
                </label>
                <div className="flex overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="flex items-center bg-zinc-50 px-3 text-xs font-bold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full bg-white px-3 py-3 text-sm font-semibold outline-none dark:bg-zinc-950 dark:text-white"
                    required
                  />
                </div>
                <p className="mt-1.5 text-[10px] font-medium text-zinc-400">
                  Required for delivery updates and order confirmation SMS
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-black py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {saving ? "Saving..." : "Continue"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <IoNotificationsOutline className="mt-0.5 text-lg text-zinc-600 dark:text-zinc-300" />
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Allow notifications</h3>
                      <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                        Get order status, delivery and offer alerts from Zentro.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={requestNotifications}
                    disabled={busyAction === "notifications"}
                    className="shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-60 dark:bg-white dark:text-black"
                  >
                    {notifDone ? "Update" : busyAction === "notifications" ? "..." : "Allow"}
                  </button>
                </div>
                {notifDone && (
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                    Saved: {user?.notifications?.permission || "updated"}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <IoLocationOutline className="mt-0.5 text-lg text-zinc-600 dark:text-zinc-300" />
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Allow location</h3>
                      <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                        Helps us suggest delivery areas and improve checkout accuracy.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={busyAction === "location"}
                    className="shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-60 dark:bg-white dark:text-black"
                  >
                    {locDone ? "Update" : busyAction === "location" ? "..." : "Allow"}
                  </button>
                </div>
                {locDone && (
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                    Saved: {user?.location?.permission}
                    {user?.location?.permission === "granted" && user?.location?.latitude != null
                      ? ` · ${Number(user.location.latitude).toFixed(3)}, ${Number(user.location.longitude).toFixed(3)}`
                      : ""}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-[11px] font-medium text-zinc-500 dark:border-zinc-900 dark:bg-zinc-900/40">
                Mobile on file: <span className="font-bold text-zinc-900 dark:text-white">+91 {normalizeMobile(user?.mobile)}</span>
              </div>

              <button
                type="button"
                onClick={finishOnboarding}
                disabled={busyAction === "finish"}
                className="mt-1 w-full rounded-xl bg-black py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {busyAction === "finish" ? "Saving..." : "Finish & Continue Shopping"}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PermissionOnboarding;
