"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  IoBicycleOutline,
  IoCameraOutline,
  IoCheckmarkCircleOutline,
  IoLocationOutline
} from "react-icons/io5";
import toast from "react-hot-toast";

import api from "../../../utils/api.js";
import { setCredentials } from "../../../store/slices/authSlice.js";

const STEPS = ["personal", "otp", "identity", "vehicle", "bank", "location"];

const emptyAddress = {
  houseNo: "",
  street: "",
  landmark: "",
  city: "",
  state: "",
  country: "India",
  zipCode: ""
};

const DeliveryRegisterPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [step, setStep] = useState("personal");
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [registrationToken, setRegistrationToken] = useState("");
  const [cameraOn, setCameraOn] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    dateOfBirth: "",
    age: "",
    currentAddress: { ...emptyAddress },
    otp: "",
    aadhaarNumber: "",
    aadhaarDocumentUrl: "",
    selfieUrl: "",
    vehicleNumber: "",
    vehicleDetails: "",
    bank: {
      accountHolderName: "",
      accountNumber: "",
      ifsc: "",
      bankName: ""
    },
    location: {
      latitude: null,
      longitude: null,
      accuracy: null,
      trackingConsent: false
    }
  });

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setAddr = (key, value) =>
    setForm((f) => ({ ...f, currentAddress: { ...f.currentAddress, [key]: value } }));
  const setBank = (key, value) =>
    setForm((f) => ({ ...f, bank: { ...f.bank, [key]: value } }));

  const stopCamera = () => {
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => () => {
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      toast.error("Camera access is required for live selfie verification");
    }
  };

  const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const uploadBlob = async (blob, kind, fileName) => {
    if (!registrationToken) throw new Error("Verify email first");
    const contentType = blob.type || "image/jpeg";
    try {
      const presign = await api.post("/delivery/uploads/presign", {
        registrationToken,
        fileName,
        contentType,
        kind
      });
      if (!presign.data.success) throw new Error("Upload unavailable");
      const { uploadUrl, publicUrl } = presign.data;
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob
      });
      if (!putRes.ok) throw new Error("Upload failed");
      return publicUrl;
    } catch {
      // Dev / offline fallback when S3 is not configured
      return blobToDataUrl(blob);
    }
  };

  const captureSelfie = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) {
      toast.error("Could not capture selfie");
      return;
    }
    setSubmitting(true);
    try {
      const url = await uploadBlob(blob, "selfie", `selfie-${Date.now()}.jpg`);
      setField("selfieUrl", url);
      stopCamera();
      toast.success("Selfie captured");
    } catch (err) {
      toast.error(err.message || "Selfie upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onAadhaarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Upload an image of your Aadhaar");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    setSubmitting(true);
    try {
      const url = await uploadBlob(file, "aadhaar", file.name);
      setField("aadhaarDocumentUrl", url);
      toast.success("Aadhaar image uploaded");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const requestOtp = async () => {
    if (!form.email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/delivery/auth/otp/request", {
        email: form.email.toLowerCase().trim(),
        purpose: "delivery_register"
      });
      if (res.data.success) {
        setStep("otp");
        setCountdown(60);
        toast.success("OTP sent");
        if (res.data.devOtp) toast(`Dev OTP: ${res.data.devOtp}`, { duration: 8000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    setSubmitting(true);
    try {
      const res = await api.post("/delivery/auth/otp/verify", {
        email: form.email.toLowerCase().trim(),
        otp: form.otp,
        purpose: "delivery_register"
      });
      if (res.data.success) {
        setRegistrationToken(res.data.registrationToken);
        setStep("identity");
        toast.success("Email verified");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          location: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            trackingConsent: true
          }
        }));
        toast.success("Location captured");
      },
      () => toast.error("Location permission denied"),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const submitApplication = async () => {
    if (!form.location.latitude) {
      toast.error("Capture your current location");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/delivery/auth/register", {
        registrationToken,
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        age: form.age ? Number(form.age) : undefined,
        mobile: form.mobile,
        currentAddress: form.currentAddress,
        aadhaarNumber: form.aadhaarNumber,
        aadhaarDocumentUrl: form.aadhaarDocumentUrl,
        selfieUrl: form.selfieUrl,
        vehicleNumber: form.vehicleNumber,
        vehicleDetails: form.vehicleDetails,
        bank: form.bank,
        location: form.location
      });
      if (res.data.success) {
        dispatch(
          setCredentials({
            user: res.data.user,
            token: res.data.token,
            refreshToken: res.data.refreshToken
          })
        );
        toast.success("Application submitted");
        router.push("/delivery");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const nextFromPersonal = () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.mobile.trim()) {
      toast.error("Name, email and mobile are required");
      return;
    }
    if (!form.currentAddress.city || !form.currentAddress.zipCode) {
      toast.error("City and PIN are required");
      return;
    }
    requestOtp();
  };

  const nextFromIdentity = () => {
    if (String(form.aadhaarNumber).replace(/\D/g, "").length !== 12) {
      toast.error("Enter 12-digit Aadhaar");
      return;
    }
    if (!form.selfieUrl) {
      toast.error("Capture a live selfie");
      return;
    }
    setStep("vehicle");
  };

  const stepIndex = STEPS.indexOf(step);

  const inputCls =
    "w-full border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-sm outline-none focus:border-zinc-500";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% -10%, rgba(255,255,255,0.1), transparent)"
        }}
      />
      <div className="relative mx-auto max-w-lg px-5 py-12">
        <div className="mb-8 flex items-center gap-3">
          <IoBicycleOutline className="text-2xl text-zinc-300" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">Zentro Delivery</p>
            <h1 className="font-serif text-2xl">Partner Application</h1>
          </div>
        </div>

        <div className="mb-8 flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 ${i <= stepIndex ? "bg-white" : "bg-zinc-800"}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {step === "personal" && (
              <>
                <p className="text-sm text-zinc-400">Personal details & address</p>
                <input className={inputCls} placeholder="Full name" value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} />
                <input className={inputCls} type="email" placeholder="Email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                <input className={inputCls} placeholder="Mobile (10 digits)" value={form.mobile} onChange={(e) => setField("mobile", e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <input className={inputCls} type="date" value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} />
                  <input className={inputCls} type="number" placeholder="Age" value={form.age} onChange={(e) => setField("age", e.target.value)} />
                </div>
                <input className={inputCls} placeholder="House / Flat no." value={form.currentAddress.houseNo} onChange={(e) => setAddr("houseNo", e.target.value)} />
                <input className={inputCls} placeholder="Street" value={form.currentAddress.street} onChange={(e) => setAddr("street", e.target.value)} />
                <input className={inputCls} placeholder="Landmark" value={form.currentAddress.landmark} onChange={(e) => setAddr("landmark", e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <input className={inputCls} placeholder="City" value={form.currentAddress.city} onChange={(e) => setAddr("city", e.target.value)} />
                  <input className={inputCls} placeholder="State" value={form.currentAddress.state} onChange={(e) => setAddr("state", e.target.value)} />
                </div>
                <input className={inputCls} placeholder="PIN code" value={form.currentAddress.zipCode} onChange={(e) => setAddr("zipCode", e.target.value)} />
                <button type="button" disabled={submitting} onClick={nextFromPersonal} className="w-full bg-white py-3 text-sm font-medium text-black disabled:opacity-50">
                  Continue to email verify
                </button>
              </>
            )}

            {step === "otp" && (
              <>
                <p className="text-sm text-zinc-400">Verify {form.email}</p>
                <input
                  className={`${inputCls} text-center tracking-[0.4em]`}
                  maxLength={6}
                  placeholder="OTP"
                  value={form.otp}
                  onChange={(e) => setField("otp", e.target.value)}
                />
                <button type="button" disabled={submitting} onClick={verifyOtp} className="w-full bg-white py-3 text-sm font-medium text-black disabled:opacity-50">
                  Verify OTP
                </button>
                <button type="button" disabled={countdown > 0} onClick={requestOtp} className="w-full text-xs text-zinc-500 disabled:opacity-40">
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                </button>
              </>
            )}

            {step === "identity" && (
              <>
                <p className="text-sm text-zinc-400">Identity verification (Aadhaar + live selfie)</p>
                <input
                  className={inputCls}
                  placeholder="Aadhaar number (12 digits)"
                  value={form.aadhaarNumber}
                  onChange={(e) => setField("aadhaarNumber", e.target.value)}
                />
                <label className="block border border-dashed border-zinc-700 p-4 text-center text-sm text-zinc-400">
                  {form.aadhaarDocumentUrl ? (
                    <span className="flex items-center justify-center gap-2 text-emerald-400">
                      <IoCheckmarkCircleOutline /> Aadhaar image uploaded
                    </span>
                  ) : (
                    "Upload Aadhaar image"
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={onAadhaarFile} />
                </label>

                <div className="space-y-3 border border-zinc-800 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <IoCameraOutline /> Live selfie
                    </span>
                    {!cameraOn ? (
                      <button type="button" onClick={startCamera} className="text-xs text-zinc-200 underline">
                        Start camera
                      </button>
                    ) : (
                      <button type="button" onClick={captureSelfie} disabled={submitting} className="text-xs text-white underline">
                        Capture
                      </button>
                    )}
                  </div>
                  <video ref={videoRef} playsInline muted className={`w-full bg-black ${cameraOn ? "block" : "hidden"}`} />
                  {form.selfieUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.selfieUrl} alt="Selfie" className="mx-auto h-32 w-32 object-cover" />
                  )}
                </div>

                <button type="button" onClick={nextFromIdentity} className="w-full bg-white py-3 text-sm font-medium text-black">
                  Continue
                </button>
              </>
            )}

            {step === "vehicle" && (
              <>
                <p className="text-sm text-zinc-400">Vehicle details</p>
                <input className={inputCls} placeholder="Bike / vehicle number" value={form.vehicleNumber} onChange={(e) => setField("vehicleNumber", e.target.value)} />
                <textarea className={inputCls} rows={3} placeholder="Vehicle details (make, model, color)" value={form.vehicleDetails} onChange={(e) => setField("vehicleDetails", e.target.value)} />
                <button
                  type="button"
                  onClick={() => {
                    if (!form.vehicleNumber.trim()) {
                      toast.error("Vehicle number required");
                      return;
                    }
                    setStep("bank");
                  }}
                  className="w-full bg-white py-3 text-sm font-medium text-black"
                >
                  Continue
                </button>
              </>
            )}

            {step === "bank" && (
              <>
                <p className="text-sm text-zinc-400">Bank account for payouts</p>
                <input className={inputCls} placeholder="Account holder name" value={form.bank.accountHolderName} onChange={(e) => setBank("accountHolderName", e.target.value)} />
                <input className={inputCls} placeholder="Account number" value={form.bank.accountNumber} onChange={(e) => setBank("accountNumber", e.target.value)} />
                <input className={inputCls} placeholder="IFSC" value={form.bank.ifsc} onChange={(e) => setBank("ifsc", e.target.value)} />
                <input className={inputCls} placeholder="Bank name" value={form.bank.bankName} onChange={(e) => setBank("bankName", e.target.value)} />
                <button
                  type="button"
                  onClick={() => {
                    if (!form.bank.accountNumber || !form.bank.ifsc || !form.bank.accountHolderName) {
                      toast.error("Complete bank details");
                      return;
                    }
                    setStep("location");
                  }}
                  className="w-full bg-white py-3 text-sm font-medium text-black"
                >
                  Continue
                </button>
              </>
            )}

            {step === "location" && (
              <>
                <p className="text-sm text-zinc-400">One-time location for service area (no continuous tracking)</p>
                <button
                  type="button"
                  onClick={captureLocation}
                  className="flex w-full items-center justify-center gap-2 border border-zinc-700 py-3 text-sm text-zinc-200"
                >
                  <IoLocationOutline /> Use my current location
                </button>
                {form.location.latitude != null && (
                  <p className="text-xs text-emerald-400">
                    Captured: {form.location.latitude.toFixed(5)}, {form.location.longitude.toFixed(5)}
                  </p>
                )}
                <button type="button" disabled={submitting} onClick={submitApplication} className="w-full bg-white py-3 text-sm font-medium text-black disabled:opacity-50">
                  {submitting ? "Submitting…" : "Submit application"}
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <p className="mt-10 text-center text-sm text-zinc-500">
          Already a partner?{" "}
          <Link href="/delivery/login" className="text-zinc-200 underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default DeliveryRegisterPage;
