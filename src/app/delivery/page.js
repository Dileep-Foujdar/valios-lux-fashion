"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import {
  IoBicycleOutline,
  IoCompassOutline,
  IoWalletOutline,
  IoCheckboxOutline,
  IoLocationOutline,
  IoRefreshOutline,
  IoWarningOutline
} from "react-icons/io5";
import toast from "react-hot-toast";

import Navbar from "../../components/Navbar.js";
import Footer from "../../components/Footer.js";
import Modal from "../../components/Modal.js";
import { DashboardSkeleton } from "../../components/Skeleton.js";
import api from "../../utils/api.js";

const DeliveryDashboard = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Tab selector: "jobs" | "earnings"
  const [activeTab, setActiveTab] = useState("jobs");
  const [loading, setLoading] = useState(true);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [earnings, setEarnings] = useState(null);

  // Deliver action modal
  const [activeDeliveryOrder, setActiveDeliveryOrder] = useState(null);
  const [deliveryOtp, setDeliveryOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Socket for live tracking
  const [socket, setSocket] = useState(null);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState(null);

  // ── Fetch helpers (before useEffects) ──

  const fetchDeliveryJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/delivery/assigned");
      if (res.data.success) {
        setAssignedOrders(res.data.orders);
      }
    } catch (err) {
      toast.error("Failed to load assigned orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourierEarnings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/delivery/earnings");
      if (res.data.success) {
        setEarnings(res.data);
      }
    } catch (err) {
      toast.error("Failed to load earnings stats");
    } finally {
      setLoading(false);
    }
  };

  // Security check: must be delivery partner
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
    } else if (user && user.role !== "Delivery Partner") {
      toast.error("Unauthorized access. Courier privileges required.");
      router.push("/");
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDeliveryJobs();
    }
  }, [isAuthenticated, user, router]);

  // Tab dynamic load
  useEffect(() => {
    if (!user) return;
    if (activeTab === "jobs") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDeliveryJobs();
    } else if (activeTab === "earnings") {
      fetchCourierEarnings();
    }
  }, [activeTab, user]);

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;
    const socketInstance = io();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(socketInstance);

    socketInstance.emit("join", { userId: user._id, role: user.role });

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  // Simulate Geo-Location Pings
  useEffect(() => {
    if (!socket || !activeTrackingOrderId) return;

    let coords = { lat: 85, lng: 85 };

    const pingInterval = setInterval(() => {
      coords = {
        lat: coords.lat > 50 ? coords.lat - 5 : 50,
        lng: coords.lng > 50 ? coords.lng - 5 : 50
      };

      socket.emit("updateLocation", {
        orderId: activeTrackingOrderId,
        latitude: coords.lat,
        longitude: coords.lng
      });

      if (coords.lat === 50 && coords.lng === 50) {
        clearInterval(pingInterval);
        setActiveTrackingOrderId(null);
        toast.success("Destination reached! Geolocation ping complete.");
      }
    }, 5000);

    return () => clearInterval(pingInterval);
  }, [socket, activeTrackingOrderId]);

  // Accept task
  const handleAcceptPickup = async (orderId) => {
    const loadId = toast.loading("Confirming package pickup...");
    try {
      const res = await api.put(`/delivery/accept/${orderId}`);
      if (res.data.success) {
        toast.success("Order picked up. Courier transit mode active.", { id: loadId });
        fetchDeliveryJobs();
        
        // Start live tracking location broadcast
        setActiveTrackingOrderId(orderId);
      }
    } catch (err) {
      toast.error("Pickup confirmation failed.", { id: loadId });
    }
  };

  // Reject task
  const handleRejectAssignment = async (orderId) => {
    if (!window.confirm("Return this order back to admin assignment pool?")) return;

    const loadId = toast.loading("Returning assignment...");
    try {
      const res = await api.put(`/delivery/reject/${orderId}`);
      if (res.data.success) {
        toast.success("Assignment returned successfully", { id: loadId });
        fetchDeliveryJobs();
      }
    } catch (err) {
      toast.error("Process failed.", { id: loadId });
    }
  };

  // Verify Delivery OTP submit
  const handleVerifyDeliveryOTP = async (e) => {
    e.preventDefault();
    if (!deliveryOtp.trim()) return;

    setIsVerifying(true);
    const loadId = toast.loading("Verifying OTP drop-off code...");
    try {
      const res = await api.put(`/delivery/deliver/${activeDeliveryOrder._id}`, { otp: deliveryOtp.trim() });
      if (res.data.success) {
        toast.success("Verification successful! Package drop-off complete.", { id: loadId });
        setIsVerifying(false);
        setActiveDeliveryOrder(null);
        setDeliveryOtp("");
        fetchDeliveryJobs();
        
        // Stop location simulation
        setActiveTrackingOrderId(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP code", { id: loadId });
      setIsVerifying(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors min-h-[80vh]">
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* NAVIGATION SIDEBAR */}
          <aside className="flex flex-col gap-2.5">
            <div className="rounded-2xl border border-zinc-100 p-5 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider truncate">Courier Center</h2>
              <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold">{user?.name}</p>
            </div>

            <button
              onClick={() => setActiveTab("jobs")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "jobs" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoBicycleOutline className="text-base" /> Assigned Delivery Jobs
            </button>

            <button
              onClick={() => setActiveTab("earnings")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "earnings" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoWalletOutline className="text-base" /> Courier Earnings
            </button>
          </aside>

          {/* DYNAMIC VIEWPORTS */}
          <div className="lg:col-span-3">
            
            {loading ? (
              <DashboardSkeleton />
            ) : (
              <>
                
                {/* TAB: ASSIGNED JOBS */}
                {activeTab === "jobs" && (
                  <div className="flex flex-col gap-6 animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-4 dark:border-zinc-900">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider">Active Assignments</h3>
                      <button onClick={fetchDeliveryJobs} className="text-zinc-500 hover:text-black dark:hover:text-white">
                        <IoRefreshOutline className="text-lg" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-6">
                      {assignedOrders.length === 0 ? (
                        <div className="border border-dashed border-zinc-150 rounded-2xl p-16 text-center dark:border-zinc-850">
                          <p className="text-xs text-zinc-400">No active delivery tasks assigned. Check back later.</p>
                        </div>
                      ) : (
                        assignedOrders.map(ord => (
                          <div
                            key={ord._id}
                            className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 flex flex-col gap-4 animate-scaleUp"
                          >
                            {/* Header details */}
                            <div className="flex justify-between items-center border-b border-zinc-50 pb-3 dark:border-zinc-900">
                              <div>
                                <span className="text-[9px] text-zinc-400 font-bold uppercase block">Order Task</span>
                                <span className="text-xs font-bold uppercase">#{ord.orderNumber}</span>
                              </div>
                              <span className="rounded bg-zinc-100 px-2 py-0.5 text-[9px] font-bold text-zinc-600 dark:bg-zinc-900 uppercase">
                                {ord.orderStatus}
                              </span>
                            </div>

                            {/* Customer information */}
                            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex flex-col gap-2">
                              <p className="text-zinc-900 dark:text-white flex items-center gap-1">
                                <IoLocationOutline className="text-base text-zinc-400" />
                                <span>{ord.shippingAddress.name}</span>
                              </p>
                              <p className="pl-5 leading-relaxed">
                                {ord.shippingAddress.street}, {ord.shippingAddress.city}, {ord.shippingAddress.state} - {ord.shippingAddress.zipCode}
                              </p>
                              <p className="pl-5">Phone: {ord.shippingAddress.phone}</p>
                              <p className="pl-5 text-zinc-900 dark:text-white">
                                Payment: <strong className="uppercase">{ord.paymentMethod}</strong> (Collect ₹{ord.pricing.total})
                              </p>
                            </div>

                            {/* Job actions */}
                            <div className="flex flex-wrap gap-3 items-center justify-end border-t border-zinc-50 pt-3 dark:border-zinc-900 mt-2">
                              {/* If courier location is actively tracked */}
                              {activeTrackingOrderId === ord._id && (
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mr-auto uppercase">
                                  <IoCompassOutline className="text-sm animate-spin" /> Broadcasting Live Map Coordinates
                                </span>
                              )}

                              {/* Reject/Return assignment */}
                              {["Confirmed", "Packed"].includes(ord.orderStatus) && (
                                <button
                                  onClick={() => handleRejectAssignment(ord._id)}
                                  className="rounded-full border border-zinc-200 px-4 py-2 text-[10px] font-bold uppercase hover:bg-zinc-50 dark:border-zinc-800"
                                >
                                  Reject Pickup
                                </button>
                              )}

                              {/* Accept/Transit actions */}
                              {["Confirmed", "Packed"].includes(ord.orderStatus) && (
                                <button
                                  onClick={() => handleAcceptPickup(ord._id)}
                                  className="rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black px-5 py-2 text-[10px] font-bold uppercase hover:opacity-90"
                                >
                                  Accept Pickup
                                </button>
                              )}

                              {/* Out for Delivery transit */}
                              {ord.orderStatus === "Shipped" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord._id, "OutForDelivery")}
                                  className="rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black px-5 py-2 text-[10px] font-bold uppercase hover:opacity-90"
                                >
                                  Mark Out For Delivery
                                </button>
                              )}

                              {/* Mark Delivered */}
                              {ord.orderStatus === "OutForDelivery" && (
                                <button
                                  onClick={() => setActiveDeliveryOrder(ord)}
                                  className="rounded-full bg-emerald-500 text-white px-5 py-2 text-[10px] font-bold uppercase hover:opacity-90 flex items-center gap-1"
                                >
                                  <IoCheckboxOutline /> Complete Drop-off
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB: COURIER EARNINGS */}
                {activeTab === "earnings" && earnings && (
                  <div className="flex flex-col gap-6 animate-fadeIn">
                    <div className="border-b border-zinc-100 pb-4 dark:border-zinc-900">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider">Earnings Ledger</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                      <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">Completed Deliveries</span>
                        <h3 className="text-2xl font-black mt-2">{earnings.deliveredCount} Trips</h3>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">Net payout earnings</span>
                        <h3 className="text-2xl font-black mt-2 text-emerald-500">₹{earnings.totalEarnings}</h3>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-4">Trip log details</h4>
                      <div className="flex flex-col gap-3">
                        {earnings.trips?.length === 0 ? (
                          <p className="text-xs text-zinc-400">No completed trips registered yet.</p>
                        ) : (
                          earnings.trips.map((trip, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs border-b border-zinc-50 pb-2.5 dark:border-zinc-900">
                              <div>
                                <h5 className="font-bold uppercase">Order #{trip.orderNumber}</h5>
                                <p className="text-[10px] text-zinc-400 mt-0.5">Delivered: {new Date(trip.updatedAt).toLocaleDateString()}</p>
                              </div>
                              <span className="font-bold text-green-600">+₹{earnings.payoutPerDelivery} Payout</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </>
            )}

          </div>

        </div>

      </main>

      {/* MODAL: VERIFY DELIVERY OTP */}
      <Modal
        isOpen={!!activeDeliveryOrder}
        onClose={() => setActiveDeliveryOrder(null)}
        title="Complete Package Drop-off"
      >
        <form onSubmit={handleVerifyDeliveryOTP} className="flex flex-col gap-5 text-xs">
          <div className="rounded-2xl bg-zinc-50 p-4 border border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-900">
            <p className="text-xs text-zinc-500">
              Please collect cash payment (if COD: <strong className="text-zinc-900 dark:text-white">₹{activeDeliveryOrder?.pricing?.total}</strong>) from the customer, then request their 6-digit delivery OTP to verify drop-off.
            </p>
          </div>

          <div>
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">
              Enter Customer Delivery OTP
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="######"
              value={deliveryOtp}
              onChange={(e) => setDeliveryOtp(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 text-center text-sm font-bold tracking-[0.4em] outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full rounded-xl bg-black py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 dark:bg-white dark:text-black"
          >
            {isVerifying ? "Verifying..." : "Confirm & Mark Delivered"}
          </button>
        </form>
      </Modal>

      <Footer />
    </>
  );
};

export default DeliveryDashboard;
