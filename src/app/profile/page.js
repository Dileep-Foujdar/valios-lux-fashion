"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import {
  IoPersonOutline,
  IoLocationOutline,
  IoBagCheckOutline,
  IoWalletOutline,
  IoGiftOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoMapOutline,
  IoCompassOutline,
  IoRefreshOutline
} from "react-icons/io5";
import toast from "react-hot-toast";

import Navbar from "../../components/Navbar.js";
import Footer from "../../components/Footer.js";
import Modal from "../../components/Modal.js";
import api from "../../utils/api.js";
import { setCredentials } from "../../store/slices/authSlice.js";

const ProfilePage = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  // Tab selector: "profile" | "addresses" | "orders" | "wallet"
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [walletInfo, setWalletInfo] = useState({ walletBalance: 0, referralCode: "", referredCount: 0, referredUsers: [] });
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Edit profile states
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [mobileInput, setMobileInput] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Return/Replace Modal states
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [activeReturnOrder, setActiveReturnOrder] = useState(null);
  const [returnAction, setReturnAction] = useState("Return"); // Return or Replace
  const [returnReason, setReturnReason] = useState("");

  // Tracking details
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [agentCoords, setAgentCoords] = useState({ lat: 50, lng: 50 }); // radar simulated coordinates

  // ── Fetch helpers (before useEffects) ──

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.get("/orders/my");
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      toast.error("Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await api.get("/users/profile");
      if (res.data.success) {
        setAddresses(res.data.user.addresses || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWalletInfo = async () => {
    try {
      const res = await api.get("/users/wallet-referrals");
      if (res.data.success) {
        setWalletInfo(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
    } else if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNameInput(user.name);
      setEmailInput(user.email);
      setMobileInput(user.mobile);
      fetchAddresses();
      fetchOrders();
      fetchWalletInfo();
    }
  }, [isAuthenticated, user, router]);

  // Socket.io for Realtime Agent Tracking
  useEffect(() => {
    if (!trackingOrder) return;
    const socket = io();
    socket.emit("join", { userId: user?._id });
    socket.emit("joinOrderTracking", { orderId: trackingOrder._id });

    socket.on("locationUpdated", (data) => {
      setAgentCoords({ lat: data.latitude, lng: data.longitude });
      toast.success("Delivery Agent location updated!");
    });

    const movementInterval = setInterval(() => {
      setAgentCoords(prev => {
        const nextLat = prev.lat > 15 ? prev.lat - 1.5 : 15;
        const nextLng = prev.lng > 15 ? prev.lng - 1.2 : 15;
        return { lat: nextLat, lng: nextLng };
      });
    }, 4000);

    return () => {
      socket.disconnect();
      clearInterval(movementInterval);
    };
  }, [trackingOrder, user]);

  // Profile Save
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await api.put("/users/profile", {
        name: nameInput,
        email: emailInput,
        mobile: mobileInput
      });

      if (res.data.success) {
        toast.success("Profile details updated!");
        // Update user state
        dispatch(setCredentials({
          user: res.data.user,
          token: localStorage.getItem("token"), // keep existing
          refreshToken: localStorage.getItem("refreshToken")
        }));
      }
    } catch (err) {
      toast.error("Profile update failed.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Cancel order
  const handleCancelOrder = async (orderId) => {
    const reason = window.prompt("Please specify a reason for cancellation:");
    if (reason === null) return; // cancelled

    const loadId = toast.loading("Processing order cancellation...");
    try {
      const res = await api.put(`/orders/${orderId}/cancel`, { reason });
      if (res.data.success) {
        toast.success("Order cancelled, refund added to wallet", { id: loadId });
        fetchOrders();
        fetchWalletInfo();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel order", { id: loadId });
    }
  };

  // Return / Replace Submit
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnReason.trim()) return;

    const loadId = toast.loading("Submitting return request...");
    try {
      const res = await api.put(`/orders/${activeReturnOrder._id}/return`, {
        action: returnAction,
        reason: returnReason
      });

      if (res.data.success) {
        toast.success("Request processed successfully!", { id: loadId });
        setIsReturnModalOpen(false);
        setReturnReason("");
        fetchOrders();
        fetchWalletInfo();
      }
    } catch (err) {
      toast.error("Process failed. Try again.", { id: loadId });
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors min-h-[75vh]">
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* PROFILE PANEL NAVIGATION */}
          <aside className="flex flex-col gap-2.5">
            <div className="rounded-2xl border border-zinc-100 p-5 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10 mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white truncate">
                {user?.name}
              </h2>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                Role: {user?.role}
              </p>
            </div>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "orders" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoBagCheckOutline className="text-base" /> My Orders
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "profile" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoPersonOutline className="text-base" /> Edit Profile
            </button>

            <button
              onClick={() => setActiveTab("addresses")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "addresses" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoLocationOutline className="text-base" /> Address Book
            </button>

            <button
              onClick={() => setActiveTab("wallet")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "wallet" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoWalletOutline className="text-base" /> Wallet & Referrals
            </button>
          </aside>

          {/* ACTIVE TAB DISPLAY PANEL */}
          <div className="lg:col-span-3">
            
            {/* TAB: MY ORDERS */}
            {activeTab === "orders" && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-4 dark:border-zinc-900">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">Purchase History</h3>
                  <button onClick={fetchOrders} className="text-zinc-500 hover:text-black dark:hover:text-white">
                    <IoRefreshOutline className="text-lg" />
                  </button>
                </div>

                {loadingOrders ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-48 w-full animate-pulse rounded-2xl bg-zinc-50 dark:bg-zinc-900" />
                  ))
                ) : orders.length === 0 ? (
                  <div className="border border-dashed border-zinc-150 rounded-2xl p-16 text-center dark:border-zinc-850">
                    <p className="text-xs text-zinc-400">You haven&apos;t placed any orders yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {orders.map((ord) => (
                      <div
                        key={ord._id}
                        className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 flex flex-col gap-4"
                      >
                        {/* Order Header info */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-50 pb-3 dark:border-zinc-900">
                          <div>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Order Number</span>
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase">{ord.orderNumber}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                              {ord.orderStatus}
                            </span>
                            <span className="text-xs font-bold">₹{ord.pricing.total}</span>
                          </div>
                        </div>

                        {/* Order Items list */}
                        <div className="flex flex-col gap-3">
                          {ord.items.map((item, idx) => (
                            <div key={idx} className="flex gap-3 text-xs font-semibold">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.product?.images?.[0]} alt="" className="h-12 w-10 rounded object-cover flex-shrink-0" />
                              <div className="flex-grow overflow-hidden">
                                <h4 className="truncate">{item.product?.title || "Fashion Item"}</h4>
                                <p className="text-[10px] text-zinc-400 mt-0.5">Qty: {item.quantity} | Size: {item.size} | Color: {item.color}</p>
                              </div>
                              <span className="font-bold">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {/* Actions & Delivery status */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-50 pt-3 dark:border-zinc-900 mt-2">
                          <div className="text-xs">
                            <span className="text-[10px] text-zinc-400 block font-bold uppercase">Date Placed</span>
                            <span className="font-medium text-zinc-600 dark:text-zinc-400">{new Date(ord.createdAt).toLocaleDateString()}</span>
                          </div>

                          <div className="flex gap-2">
                            {/* Real-time location tracking link */}
                            {["Shipped", "OutForDelivery"].includes(ord.orderStatus) && (
                              <button
                                onClick={() => setTrackingOrder(ord)}
                                className="rounded-full bg-zinc-900 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200 flex items-center gap-1.5"
                              >
                                <IoMapOutline /> Track Live Courier
                              </button>
                            )}

                            {/* Delivery secure OTP prompt */}
                            {ord.orderStatus === "OutForDelivery" && ord.otpForDelivery && (
                              <div className="rounded-full bg-emerald-50 border border-emerald-100 px-4 py-2 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900">
                                Delivery OTP: {ord.otpForDelivery}
                              </div>
                            )}

                            {/* Cancellations */}
                            {["Pending", "Confirmed"].includes(ord.orderStatus) && (
                              <button
                                onClick={() => handleCancelOrder(ord._id)}
                                className="rounded-full border border-red-200 text-red-600 px-4 py-2 text-[10px] font-bold uppercase hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/10"
                              >
                                Cancel Order
                              </button>
                            )}

                            {/* Returns and replacements */}
                            {ord.orderStatus === "Delivered" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setActiveReturnOrder(ord);
                                    setReturnAction("Return");
                                    setIsReturnModalOpen(true);
                                  }}
                                  className="rounded-full border border-zinc-200 px-4 py-2 text-[10px] font-bold uppercase hover:bg-zinc-50 dark:border-zinc-800"
                                >
                                  Return
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveReturnOrder(ord);
                                    setReturnAction("Replace");
                                    setIsReturnModalOpen(true);
                                  }}
                                  className="rounded-full border border-zinc-200 px-4 py-2 text-[10px] font-bold uppercase hover:bg-zinc-50 dark:border-zinc-800"
                                >
                                  Replace
                                </button>
                              </div>
                            )}

                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: EDIT PROFILE */}
            {activeTab === "profile" && (
              <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-900 bg-white shadow-sm flex flex-col gap-6 animate-fadeIn">
                <h3 className="text-sm font-extrabold uppercase tracking-wider border-b border-zinc-100 pb-4 dark:border-zinc-900">
                  Profile Details
                </h3>

                <form onSubmit={handleProfileSave} className="flex flex-col gap-4 max-w-md">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={mobileInput}
                      onChange={(e) => setMobileInput(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="mt-4 rounded-xl bg-black py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-850 dark:bg-white dark:text-black dark:hover:bg-zinc-150 transition-colors"
                  >
                    {isSavingProfile ? "Saving Details..." : "Save Account Settings"}
                  </button>
                </form>
              </div>
            )}

            {/* TAB: ADDRESS BOOK */}
            {activeTab === "addresses" && (
              <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-900 bg-white shadow-sm flex flex-col gap-6 animate-fadeIn">
                <h3 className="text-sm font-extrabold uppercase tracking-wider border-b border-zinc-100 pb-4 dark:border-zinc-900">
                  Saved Destinations
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.length === 0 ? (
                    <p className="text-xs text-zinc-400 sm:col-span-2">No saved addresses found. Add a destination during checkout.</p>
                  ) : (
                    addresses.map((addr) => (
                      <div
                        key={addr._id}
                        className={`p-4 border rounded-2xl flex justify-between items-start ${addr.isDefault ? "border-black dark:border-white bg-zinc-50/50 dark:bg-zinc-900/10" : "border-zinc-100 dark:border-zinc-900"}`}
                      >
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-white">{addr.name}</span>
                            {addr.isDefault && (
                              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500 dark:bg-zinc-900">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                            {addr.street}, {addr.city}, {addr.state} - {addr.zipCode}
                          </p>
                          <p className="text-zinc-400 dark:text-zinc-500 mt-1">Phone: {addr.phone}</p>
                        </div>

                        <button
                          onClick={async () => {
                            const loadId = toast.loading("Deleting address...");
                            try {
                              const res = await api.delete(`/users/address/${addr._id}`);
                              if (res.data.success) {
                                toast.success("Address deleted successfully", { id: loadId });
                                fetchAddresses();
                              }
                            } catch (err) {
                              toast.error("Delete failed.", { id: loadId });
                            }
                          }}
                          className="text-[10px] font-bold text-red-500 uppercase hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: WALLET & REFERRALS */}
            {activeTab === "wallet" && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                {/* Balance display */}
                <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest">Store Wallet Credit</span>
                    <h2 className="text-3xl font-black mt-2 text-zinc-900 dark:text-white">₹{walletInfo.walletBalance}</h2>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Directly applies at checkout to reduce payable amount.</p>
                  </div>
                  
                  {/* Referral Code card */}
                  <div className="rounded-xl border border-dashed border-zinc-200 p-4 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30">
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Your Referral Code</span>
                    <h3 className="text-base font-extrabold uppercase mt-1 text-zinc-800 dark:text-zinc-200 select-all">
                      {walletInfo.referralCode || "FASHION-XXXXXX"}
                    </h3>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-2">Share this code with friends! Both earn ₹100 credit when they sign up and place their first order.</p>
                  </div>
                </div>

                {/* Referred Users list */}
                <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                  <h3 className="text-xs font-bold uppercase tracking-wider border-b border-zinc-100 pb-4 dark:border-zinc-900 mb-4">
                    Referred Accounts ({walletInfo.referredCount})
                  </h3>

                  {walletInfo.referredUsers?.length === 0 ? (
                    <p className="text-xs text-zinc-400">You haven&apos;t referred any accounts yet. Share code to start earning credit!</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {walletInfo.referredUsers.map((refUser, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-semibold border-b border-zinc-50 pb-2.5 dark:border-zinc-900">
                          <div>
                            <h4>{refUser.name}</h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5">Joined: {new Date(refUser.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className="text-xs font-bold text-green-600">+₹100 Credit Earned</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

      </main>

      {/* MODAL: LIVE AGENT LOCATION RADAR */}
      <Modal
        isOpen={!!trackingOrder}
        onClose={() => setTrackingOrder(null)}
        title={`Live Tracking: #${trackingOrder?.orderNumber}`}
      >
        <div className="flex flex-col gap-6 items-center">
          <p className="text-xs text-zinc-500 text-center">
            Simulating live location of courier partner dispatching your package.
          </p>

          {/* Radar Map box */}
          <div className="relative h-60 w-full rounded-2xl bg-zinc-900 overflow-hidden border border-zinc-800 flex items-center justify-center">
            {/* Radar Sweep Animation */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(16,185,129,0.05)_0%,transparent_70%)] animate-pulse" />
            <div className="absolute h-full w-0.5 bg-emerald-500/10 left-1/2" />
            <div className="absolute w-full h-0.5 bg-emerald-500/10 top-1/2" />
            
            {/* Center Destination Home */}
            <div className="absolute h-4 w-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
              <span className="absolute -bottom-5 text-[9px] font-bold uppercase tracking-wider text-blue-400 whitespace-nowrap">Home</span>
            </div>

            {/* Courier Position */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute h-5 w-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg cursor-pointer"
              style={{ top: `${agentCoords.lat}%`, left: `${agentCoords.lng}%`, transform: "translate(-50%, -50%)" }}
            >
              <IoCompassOutline className="text-[10px] text-white animate-spin" />
              <span className="absolute -bottom-5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 whitespace-nowrap">Courier</span>
            </motion.div>
          </div>

          <div className="w-full text-center">
            <span className="rounded bg-emerald-50 text-emerald-600 px-3 py-1 text-[10px] font-extrabold uppercase dark:bg-emerald-950/20 dark:text-emerald-400">
              Delivery Partner Status: {trackingOrder?.orderStatus}
            </span>
            <p className="text-[10px] text-zinc-400 mt-2 font-medium">Keep this modal open to check realtime courier movements on your map.</p>
          </div>
        </div>
      </Modal>

      {/* MODAL: RETURN / REPLACE ORDER */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title={`${returnAction} Order: #${activeReturnOrder?.orderNumber}`}
      >
        <form onSubmit={handleReturnSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block">
              Specify Action
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReturnAction("Return")}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold uppercase border tracking-wider transition-all ${returnAction === "Return" ? "bg-black text-white dark:bg-white dark:text-black" : "border-zinc-200 text-zinc-400"}`}
              >
                Refund to Wallet
              </button>
              <button
                type="button"
                onClick={() => setReturnAction("Replace")}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold uppercase border tracking-wider transition-all ${returnAction === "Replace" ? "bg-black text-white dark:bg-white dark:text-black" : "border-zinc-200 text-zinc-400"}`}
              >
                Replace Item Size/Color
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block">
              Reason for Request
            </label>
            <textarea
              rows={4}
              placeholder="Please describe size issue, material defects, or item mismatch..."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-black py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 dark:bg-white dark:text-black"
          >
            Submit Return/Replacement Request
          </button>
        </form>
      </Modal>

      <Footer />
    </>
  );
};

export default ProfilePage;
