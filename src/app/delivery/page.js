"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import {
  IoBicycleOutline,
  IoWalletOutline,
  IoCheckboxOutline,
  IoPersonOutline,
  IoRefreshOutline,
  IoLogOutOutline,
  IoFlashOutline,
  IoTimeOutline
} from "react-icons/io5";
import toast from "react-hot-toast";

import Modal from "../../components/Modal.js";
import { DashboardSkeleton } from "../../components/Skeleton.js";
import api from "../../utils/api.js";
import { clearCredentials } from "../../store/slices/authSlice.js";

const STATUS_BADGE = {
  available: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  accepted: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  picked_up: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  out_for_delivery: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
  expired: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
};

const DeliveryDashboard = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState(null);
  const [stats, setStats] = useState(null);
  const [offers, setOffers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [deliverOtp, setDeliverOtp] = useState("");
  const [activeDeliver, setActiveDeliver] = useState(null);
  const [busy, setBusy] = useState(false);
  const [profileForm, setProfileForm] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const dash = await api.get("/delivery/dashboard");
      if (dash.data.success) {
        setPartner(dash.data.partner);
        setStats(dash.data.stats);
        setProfileForm({
          fullName: dash.data.partner.fullName || "",
          mobile: dash.data.partner.mobile || "",
          vehicleNumber: dash.data.partner.vehicleNumber || "",
          vehicleDetails: dash.data.partner.vehicleDetails || "",
          isOnline: dash.data.partner.isOnline,
          bank: {
            accountHolderName: dash.data.partner.bank?.accountHolderName || "",
            accountNumber: "",
            ifsc: dash.data.partner.bank?.ifsc || "",
            bankName: dash.data.partner.bank?.bankName || ""
          },
          currentAddress: dash.data.partner.currentAddress || {}
        });
      }

      if (dash.data.partner?.approvalStatus === "approved") {
        const [offersRes, assignRes] = await Promise.all([
          api.get("/delivery/offers"),
          api.get("/delivery/assignments")
        ]);
        if (offersRes.data.success) setOffers(offersRes.data.offers || []);
        if (assignRes.data.success) setAssignments(assignRes.data.assignments || []);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setPartner(null);
      } else if (err.response?.status !== 401) {
        toast.error(err.response?.data?.message || "Failed to load dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/delivery/login");
      return;
    }
    if (user && user.role !== "Delivery Partner") {
      toast.error("Delivery partner access only");
      router.replace("/");
      return;
    }
    queueMicrotask(() => {
      loadAll();
    });
  }, [isAuthenticated, user, router, loadAll]);

  useEffect(() => {
    if (!user || partner?.approvalStatus !== "approved") return undefined;
    const socketInstance = io();
    socketInstance.emit("join", { userId: user._id, role: "Delivery Partner" });
    socketInstance.on("deliveryOffer", () => {
      toast("New delivery offer available");
      loadAll();
    });
    return () => socketInstance.disconnect();
  }, [user, partner?.approvalStatus, loadAll]);

  const logout = () => {
    dispatch(clearCredentials());
    router.push("/delivery/login");
  };

  const acceptOffer = async (id) => {
    setBusy(true);
    try {
      const res = await api.put(`/delivery/assignments/${id}/accept`);
      if (res.data.success) {
        toast.success("Delivery accepted");
        await loadAll();
        setTab("current");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not accept");
      await loadAll();
    } finally {
      setBusy(false);
    }
  };

  const rejectOffer = async (id) => {
    const reason = window.prompt("Reason (optional)") || "";
    setBusy(true);
    try {
      await api.put(`/delivery/assignments/${id}/reject`, { reason });
      toast.success("Offer declined");
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id, status, otp) => {
    setBusy(true);
    try {
      const res = await api.put(`/delivery/assignments/${id}/status`, { status, otp });
      if (res.data.success) {
        toast.success(`Marked ${status.replace(/_/g, " ")}`);
        setActiveDeliver(null);
        setDeliverOtp("");
        await loadAll();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      const payload = {
        fullName: profileForm.fullName,
        mobile: profileForm.mobile,
        vehicleNumber: profileForm.vehicleNumber,
        vehicleDetails: profileForm.vehicleDetails,
        isOnline: profileForm.isOnline,
        currentAddress: profileForm.currentAddress
      };
      if (profileForm.bank?.accountNumber) {
        payload.bank = profileForm.bank;
      } else {
        payload.bank = {
          accountHolderName: profileForm.bank.accountHolderName,
          ifsc: profileForm.bank.ifsc,
          bankName: profileForm.bank.bankName
        };
      }
      const res = await api.put("/delivery/me", payload);
      if (res.data.success) {
        setPartner(res.data.partner);
        toast.success("Profile updated");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const currentJobs = assignments.filter((a) =>
    ["accepted", "picked_up", "out_for_delivery"].includes(a.status)
  );
  const history = assignments.filter((a) =>
    ["delivered", "failed", "cancelled"].includes(a.status)
  );

  if (!isAuthenticated || (user && user.role !== "Delivery Partner")) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <IoBicycleOutline className="mb-4 text-4xl text-zinc-400" />
        <h1 className="font-serif text-2xl">Complete your partner application</h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-400">
          Your account exists but the delivery profile is missing. Finish registration to continue.
        </p>
        <Link href="/delivery/register" className="mt-6 bg-white px-6 py-3 text-sm font-medium text-black">
          Continue registration
        </Link>
        <button type="button" onClick={logout} className="mt-4 text-xs text-zinc-500">
          Sign out
        </button>
      </div>
    );
  }

  if (partner.approvalStatus !== "approved") {
    const copy = {
      pending: {
        title: "Application under review",
        body: "Thanks for applying. Our team is verifying your documents. You’ll get access to jobs once approved."
      },
      draft: {
        title: "Application incomplete",
        body: "Finish your registration to submit for approval."
      },
      rejected: {
        title: "Application rejected",
        body: partner.rejectionReason || "Please contact support or re-apply with corrected documents."
      },
      suspended: {
        title: "Account suspended",
        body: "Your partner account is suspended. Contact admin for help."
      }
    }[partner.approvalStatus] || {
      title: "Awaiting approval",
      body: "Your partner account is not active yet."
    };

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <div className="mb-6 h-px w-16 bg-zinc-700" />
        <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">Kirnya Delivery</p>
        <h1 className="mt-3 font-serif text-3xl">{copy.title}</h1>
        <p className="mt-3 max-w-md text-sm text-zinc-400">{copy.body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
          <span className="border border-zinc-700 px-3 py-1 text-zinc-400">
            Email: {partner.emailVerified ? "verified" : "pending"}
          </span>
          <span className="border border-zinc-700 px-3 py-1 text-zinc-400">
            Selfie: {partner.selfieVerification}
          </span>
          <span className="border border-zinc-700 px-3 py-1 text-zinc-400">
            Aadhaar: {partner.aadhaarVerification}
          </span>
        </div>
        {partner.approvalStatus === "draft" && (
          <Link href="/delivery/register" className="mt-8 bg-white px-6 py-3 text-sm text-black">
            Continue application
          </Link>
        )}
        <button type="button" onClick={logout} className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
          <IoLogOutOutline /> Sign out
        </button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: IoFlashOutline },
    { id: "offers", label: "Offers", icon: IoTimeOutline },
    { id: "current", label: "Current", icon: IoBicycleOutline },
    { id: "history", label: "History", icon: IoCheckboxOutline },
    { id: "profile", label: "Profile", icon: IoPersonOutline }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-20 border-b border-zinc-900/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Kirnya</p>
            <h1 className="font-serif text-xl">Partner Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={loadAll} className="text-zinc-400 hover:text-white" aria-label="Refresh">
              <IoRefreshOutline className="text-xl" />
            </button>
            <button type="button" onClick={logout} className="text-zinc-400 hover:text-white" aria-label="Logout">
              <IoLogOutOutline className="text-xl" />
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 pb-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs transition ${
                tab === id ? "bg-white text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon /> {label}
              {id === "offers" && offers.length > 0 && (
                <span className="ml-1 bg-amber-400 px-1.5 text-[10px] text-black">{offers.length}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
        {tab === "overview" && stats && (
          <div className="space-y-6">
            <p className="text-sm text-zinc-400">Hi, {partner.fullName}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Today", value: `₹${stats.todayEarnings || 0}`, icon: IoWalletOutline },
                { label: "This week", value: `₹${stats.weekEarnings || 0}`, icon: IoWalletOutline },
                { label: "Completed", value: stats.completedDeliveries || 0, icon: IoCheckboxOutline },
                { label: "Open offers", value: stats.availableOffers || 0, icon: IoTimeOutline }
              ].map((k) => (
                <div key={k.label} className="border border-zinc-800 bg-zinc-900/40 p-4">
                  <k.icon className="mb-2 text-zinc-500" />
                  <p className="text-xl font-medium">{k.value}</p>
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500">{k.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-zinc-400 sm:grid-cols-4">
              <p>Month: ₹{stats.monthEarnings || 0}</p>
              <p>Total: ₹{stats.totalEarnings || 0}</p>
              <p>Active jobs: {stats.pendingDeliveries || 0}</p>
              <p>Rejected: {stats.rejectedDeliveries || 0}</p>
            </div>
            {currentJobs[0] && (
              <div className="border border-zinc-700 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Current delivery</p>
                <p className="mt-1 font-medium">{currentJobs[0].order?.orderNumber}</p>
                <p className="text-sm text-zinc-400">{currentJobs[0].areaLabel || currentJobs[0].order?.shippingAddress?.city}</p>
                <button type="button" onClick={() => setTab("current")} className="mt-3 text-xs underline text-zinc-300">
                  Open job
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "offers" && (
          <div className="space-y-4">
            {offers.length === 0 ? (
              <p className="py-16 text-center text-sm text-zinc-500">No open offers right now</p>
            ) : (
              offers.map((offer) => (
                <div key={offer._id} className="border border-zinc-800 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{offer.order?.orderNumber || "Order"}</p>
                      <p className="text-sm text-zinc-400">{offer.areaLabel || "Area TBD"}</p>
                      <p className="mt-1 text-lg">₹{offer.deliveryFee}</p>
                      {offer.expiresAt && (
                        <p className="text-xs text-zinc-500">
                          Expires {new Date(offer.expiresAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    <span className={`border px-2 py-0.5 text-[10px] uppercase ${STATUS_BADGE.available}`}>
                      available
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => acceptOffer(offer._id)}
                      className="flex-1 bg-white py-2.5 text-sm font-medium text-black disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => rejectOffer(offer._id)}
                      className="flex-1 border border-zinc-700 py-2.5 text-sm text-zinc-300 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "current" && (
          <div className="space-y-4">
            {currentJobs.length === 0 ? (
              <p className="py-16 text-center text-sm text-zinc-500">No active delivery</p>
            ) : (
              currentJobs.map((job) => {
                const addr = job.order?.shippingAddress || {};
                return (
                  <div key={job._id} className="border border-zinc-800 p-4 space-y-3">
                    <div className="flex justify-between">
                      <p className="font-medium">{job.order?.orderNumber}</p>
                      <span className={`border px-2 py-0.5 text-[10px] uppercase ${STATUS_BADGE[job.status] || ""}`}>
                        {job.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300">
                      {[addr.houseNo, addr.street, addr.landmark, addr.city, addr.zipCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p className="text-sm text-zinc-500">
                      Customer: {job.order?.customer?.name} · {job.order?.customer?.mobile}
                    </p>
                    <p className="text-sm">Fee: ₹{job.deliveryFee}</p>
                    <div className="flex flex-wrap gap-2">
                      {job.status === "accepted" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => updateStatus(job._id, "picked_up")}
                          className="bg-white px-4 py-2 text-sm text-black disabled:opacity-50"
                        >
                          Mark picked up
                        </button>
                      )}
                      {job.status === "picked_up" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => updateStatus(job._id, "out_for_delivery")}
                          className="bg-white px-4 py-2 text-sm text-black disabled:opacity-50"
                        >
                          Out for delivery
                        </button>
                      )}
                      {job.status === "out_for_delivery" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setActiveDeliver(job)}
                          className="bg-white px-4 py-2 text-sm text-black disabled:opacity-50"
                        >
                          Complete with OTP
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="py-16 text-center text-sm text-zinc-500">No completed deliveries yet</p>
            ) : (
              history.map((job) => (
                <div key={job._id} className="flex items-center justify-between border border-zinc-800 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{job.order?.orderNumber}</p>
                    <p className="text-xs text-zinc-500">
                      {job.deliveredAt ? new Date(job.deliveredAt).toLocaleString() : job.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">₹{job.deliveryFee}</p>
                    <span className={`text-[10px] uppercase ${STATUS_BADGE[job.status] || "text-zinc-500"}`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "profile" && profileForm && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500">
              Aadhaar {partner.aadhaarMasked} · Selfie {partner.selfieVerification} (identity locked after verify)
            </p>
            <input
              className="w-full border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm"
              value={profileForm.fullName}
              onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
              placeholder="Full name"
            />
            <input
              className="w-full border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm"
              value={profileForm.mobile}
              onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
              placeholder="Mobile"
            />
            <input
              className="w-full border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm"
              value={profileForm.vehicleNumber}
              onChange={(e) => setProfileForm({ ...profileForm, vehicleNumber: e.target.value })}
              placeholder="Vehicle number"
            />
            <textarea
              className="w-full border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm"
              rows={2}
              value={profileForm.vehicleDetails}
              onChange={(e) => setProfileForm({ ...profileForm, vehicleDetails: e.target.value })}
              placeholder="Vehicle details"
            />
            <p className="text-xs uppercase tracking-wider text-zinc-500">Bank (edits need re-verify)</p>
            <input
              className="w-full border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm"
              value={profileForm.bank.accountHolderName}
              onChange={(e) =>
                setProfileForm({
                  ...profileForm,
                  bank: { ...profileForm.bank, accountHolderName: e.target.value }
                })
              }
              placeholder="Account holder"
            />
            <input
              className="w-full border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm"
              value={profileForm.bank.accountNumber}
              onChange={(e) =>
                setProfileForm({
                  ...profileForm,
                  bank: { ...profileForm.bank, accountNumber: e.target.value }
                })
              }
              placeholder={`New account (current ${partner.bank?.accountMasked || "••••"})`}
            />
            <input
              className="w-full border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm"
              value={profileForm.bank.ifsc}
              onChange={(e) =>
                setProfileForm({
                  ...profileForm,
                  bank: { ...profileForm.bank, ifsc: e.target.value }
                })
              }
              placeholder="IFSC"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={!!profileForm.isOnline}
                onChange={(e) => setProfileForm({ ...profileForm, isOnline: e.target.checked })}
              />
              Online for offers
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={saveProfile}
              className="w-full bg-white py-3 text-sm font-medium text-black disabled:opacity-50"
            >
              Save profile
            </button>
          </div>
        )}
      </main>

      <Modal
        isOpen={!!activeDeliver}
        onClose={() => {
          setActiveDeliver(null);
          setDeliverOtp("");
        }}
        title="Confirm delivery"
      >
        <p className="mb-4 text-sm text-zinc-400">
          Enter the OTP shared by the customer for {activeDeliver?.order?.orderNumber}
        </p>
        <input
          className="mb-4 w-full border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-center tracking-[0.3em]"
          maxLength={6}
          value={deliverOtp}
          onChange={(e) => setDeliverOtp(e.target.value)}
          placeholder="OTP"
        />
        <button
          type="button"
          disabled={busy || deliverOtp.length < 6}
          onClick={() => updateStatus(activeDeliver._id, "delivered", deliverOtp)}
          className="w-full bg-white py-3 text-sm font-medium text-black disabled:opacity-50"
        >
          Mark delivered
        </button>
      </Modal>
    </div>
  );
};

export default DeliveryDashboard;
