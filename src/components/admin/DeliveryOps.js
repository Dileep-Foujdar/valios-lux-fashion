"use client";

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  IoBicycleOutline,
  IoSearchOutline,
  IoRefreshOutline
} from "react-icons/io5";
import api from "../../utils/api.js";
import Modal from "../Modal.js";

const badge = (status) => {
  const map = {
    pending: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    approved: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
    rejected: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
    suspended: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
    available: "bg-amber-50 text-amber-800",
    accepted: "bg-sky-50 text-sky-800",
    delivered: "bg-emerald-50 text-emerald-800",
    failed: "bg-red-50 text-red-700",
    expired: "bg-zinc-100 text-zinc-500"
  };
  return map[status] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400";
};

const DeliveryOps = ({ section = "partners" }) => {
  const [overview, setOverview] = useState(null);
  const [partners, setPartners] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [offerForm, setOfferForm] = useState({
    orderId: "",
    deliveryFee: "60",
    partnerIds: [],
    expiresInMinutes: "30",
    instructions: ""
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, partnersRes, assignRes, ordersRes] = await Promise.all([
        api.get("/admin/delivery/overview"),
        api.get(`/admin/delivery/partners${statusFilter ? `?status=${statusFilter}` : ""}${search ? `${statusFilter ? "&" : "?"}search=${encodeURIComponent(search)}` : ""}`),
        api.get(`/admin/delivery/assignments${statusFilter && section === "deliveries" ? `?status=${statusFilter}` : ""}`),
        api.get("/orders")
      ]);
      if (ov.data.success) setOverview(ov.data.overview);
      if (partnersRes.data.success) setPartners(partnersRes.data.partners || []);
      if (assignRes.data.success) setAssignments(assignRes.data.assignments || []);
      if (ordersRes.data.success) {
        setOrders(
          (ordersRes.data.orders || []).filter(
            (o) => !["Delivered", "Cancelled"].includes(o.orderStatus)
          )
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load delivery ops");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, section]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const openPartner = async (id) => {
    try {
      const res = await api.get(`/admin/delivery/partners/${id}`);
      if (res.data.success) setSelectedPartner(res.data.partner);
    } catch {
      toast.error("Could not load partner");
    }
  };

  const partnerAction = async (id, action, reason) => {
    setBusy(true);
    try {
      const res = await api.put(`/admin/delivery/partners/${id}`, { action, reason });
      if (res.data.success) {
        toast.success(`Partner ${action}d`);
        setSelectedPartner(res.data.partner);
        await load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const createOffer = async (e) => {
    e.preventDefault();
    if (!offerForm.orderId || !offerForm.deliveryFee) {
      toast.error("Select order and fee");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        orderId: offerForm.orderId,
        deliveryFee: Number(offerForm.deliveryFee),
        expiresInMinutes: Number(offerForm.expiresInMinutes) || 30,
        instructions: offerForm.instructions
      };
      if (offerForm.partnerIds.length > 0) payload.partnerIds = offerForm.partnerIds;
      const res = await api.post("/admin/delivery/offers", payload);
      if (res.data.success) {
        toast.success("Delivery offer broadcast");
        setOfferForm({
          orderId: "",
          deliveryFee: "60",
          partnerIds: [],
          expiresInMinutes: "30",
          instructions: ""
        });
        await load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Offer failed");
    } finally {
      setBusy(false);
    }
  };

  const approvedPartners = partners.filter((p) => p.approvalStatus === "approved");

  if (loading && !overview) {
    return <p className="py-16 text-center text-xs text-zinc-400">Loading delivery operations…</p>;
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-900">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider">
            {section === "partners" ? "Delivery Partners" : "Delivery Management"}
          </h3>
          <p className="mt-1 text-[11px] text-zinc-400">
            KYC approval, broadcast offers, and live assignment tracking
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-[10px] font-bold uppercase dark:border-zinc-800"
        >
          <IoRefreshOutline /> Refresh
        </button>
      </div>

      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {[
            { label: "Partners", value: overview.totalPartners },
            { label: "Active", value: overview.activePartners },
            { label: "Pending KYC", value: overview.pendingVerification },
            { label: "Available", value: overview.availablePartners },
            { label: "Busy", value: overview.busyPartners },
            { label: "Deliveries", value: overview.totalDeliveries },
            { label: "In progress", value: overview.pendingDeliveries },
            { label: "Completed", value: overview.completedDeliveries },
            { label: "Failed", value: overview.failedDeliveries },
            { label: "Fees paid", value: `₹${overview.totalDeliveryPayments || 0}` }
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-xl border border-zinc-100 bg-white p-3 dark:border-zinc-900 dark:bg-zinc-950/40"
            >
              <p className="text-lg font-bold">{k.value}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {section === "partners" && (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, mobile, bike…"
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-900">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[9px] uppercase tracking-wider text-zinc-400 dark:border-zinc-900 dark:bg-zinc-900/20">
                  <th className="p-3">Partner</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">KYC</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Registered</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {partners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-400">
                      No partners found
                    </td>
                  </tr>
                ) : (
                  partners.map((p) => (
                    <tr key={p._id} className="border-b border-zinc-50 dark:border-zinc-900">
                      <td className="p-3">
                        <p className="font-semibold">{p.fullName}</p>
                        <p className="text-[10px] text-zinc-400">{p.email}</p>
                      </td>
                      <td className="p-3">{p.mobile}</td>
                      <td className="p-3">{p.vehicleNumber || "—"}</td>
                      <td className="p-3 text-[10px] text-zinc-500">
                        A:{p.aadhaarVerification} · S:{p.selfieVerification}
                      </td>
                      <td className="p-3">
                        <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${badge(p.approvalStatus)}`}>
                          {p.approvalStatus}
                        </span>
                      </td>
                      <td className="p-3 text-[10px] text-zinc-400">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => openPartner(p._id)}
                          className="text-[10px] font-bold uppercase underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {section === "deliveries" && (
        <>
          <form
            onSubmit={createOffer}
            className="rounded-2xl border border-zinc-100 bg-white p-5 dark:border-zinc-900 dark:bg-zinc-950/40 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <IoBicycleOutline /> Broadcast delivery offer
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                required
                value={offerForm.orderId}
                onChange={(e) => setOfferForm({ ...offerForm, orderId: e.target.value })}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
              >
                <option value="">Select order</option>
                {orders.map((o) => (
                  <option key={o._id} value={o._id}>
                    #{o.orderNumber} · {o.shippingAddress?.city || "—"} · {o.orderStatus}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                required
                value={offerForm.deliveryFee}
                onChange={(e) => setOfferForm({ ...offerForm, deliveryFee: e.target.value })}
                placeholder="Delivery fee ₹"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
              />
              <input
                type="number"
                min="5"
                value={offerForm.expiresInMinutes}
                onChange={(e) => setOfferForm({ ...offerForm, expiresInMinutes: e.target.value })}
                placeholder="Expires in minutes"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
              />
              <select
                multiple
                value={offerForm.partnerIds}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    partnerIds: Array.from(e.target.selectedOptions).map((o) => o.value)
                  })
                }
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900 min-h-[80px]"
              >
                {approvedPartners.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.fullName} · {p.vehicleNumber} {p.isAvailable ? "" : "(busy)"}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-zinc-400">
              Leave partner list empty to offer to all available approved partners. Hold Ctrl/Cmd to multi-select.
            </p>
            <textarea
              value={offerForm.instructions}
              onChange={(e) => setOfferForm({ ...offerForm, instructions: e.target.value })}
              placeholder="Instructions (optional)"
              rows={2}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-black px-4 py-2 text-[10px] font-bold uppercase text-white dark:bg-white dark:text-black disabled:opacity-50"
            >
              Create & notify
            </button>
          </form>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">All assignment statuses</option>
              <option value="available">Available</option>
              <option value="accepted">Accepted</option>
              <option value="picked_up">Picked up</option>
              <option value="out_for_delivery">Out for delivery</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-900">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[9px] uppercase tracking-wider text-zinc-400 dark:border-zinc-900 dark:bg-zinc-900/20">
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Partner</th>
                  <th className="p-3">Area</th>
                  <th className="p-3">Fee</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-400">
                      No assignments yet
                    </td>
                  </tr>
                ) : (
                  assignments.map((a) => (
                    <tr key={a._id} className="border-b border-zinc-50 dark:border-zinc-900">
                      <td className="p-3 font-semibold">#{a.order?.orderNumber || "—"}</td>
                      <td className="p-3">
                        {a.order?.customer?.name || "—"}
                        <span className="block text-[10px] text-zinc-400">
                          {a.order?.customer?.mobile}
                        </span>
                      </td>
                      <td className="p-3">{a.acceptedBy?.fullName || "—"}</td>
                      <td className="p-3">{a.areaLabel || "—"}</td>
                      <td className="p-3">₹{a.deliveryFee}</td>
                      <td className="p-3">
                        <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${badge(a.status)}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="p-3 text-[10px] text-zinc-400">
                        {a.updatedAt ? new Date(a.updatedAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        isOpen={!!selectedPartner}
        onClose={() => setSelectedPartner(null)}
        title="Partner details"
        maxWidthClass="max-w-xl"
      >
        {selectedPartner && (
          <div className="space-y-4 text-xs text-zinc-700 dark:text-zinc-300">
            <div className="grid grid-cols-2 gap-3">
              <p><span className="text-zinc-400">Name</span><br />{selectedPartner.fullName}</p>
              <p><span className="text-zinc-400">Email</span><br />{selectedPartner.email}</p>
              <p><span className="text-zinc-400">Mobile</span><br />{selectedPartner.mobile}</p>
              <p><span className="text-zinc-400">Vehicle</span><br />{selectedPartner.vehicleNumber}</p>
              <p><span className="text-zinc-400">Aadhaar</span><br />{selectedPartner.aadhaar || selectedPartner.aadhaarMasked}</p>
              <p><span className="text-zinc-400">Bank</span><br />
                {selectedPartner.bank?.accountHolderName}<br />
                {selectedPartner.bank?.accountNumber || selectedPartner.bank?.accountMasked}<br />
                {selectedPartner.bank?.ifsc}
              </p>
            </div>
            {selectedPartner.selfieUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedPartner.selfieUrl} alt="Selfie" className="h-28 w-28 object-cover" />
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {selectedPartner.approvalStatus !== "approved" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => partnerAction(selectedPartner._id, "approve")}
                  className="rounded-lg bg-black px-3 py-2 text-[10px] font-bold uppercase text-white dark:bg-white dark:text-black"
                >
                  Approve
                </button>
              )}
              {selectedPartner.approvalStatus !== "rejected" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const reason = window.prompt("Rejection reason") || "Rejected";
                    partnerAction(selectedPartner._id, "reject", reason);
                  }}
                  className="rounded-lg border border-red-200 px-3 py-2 text-[10px] font-bold uppercase text-red-600"
                >
                  Reject
                </button>
              )}
              {selectedPartner.approvalStatus === "approved" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => partnerAction(selectedPartner._id, "suspend")}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-[10px] font-bold uppercase"
                >
                  Suspend
                </button>
              )}
              {selectedPartner.approvalStatus === "suspended" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => partnerAction(selectedPartner._id, "reactivate")}
                  className="rounded-lg bg-black px-3 py-2 text-[10px] font-bold uppercase text-white dark:bg-white dark:text-black"
                >
                  Reactivate
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DeliveryOps;
