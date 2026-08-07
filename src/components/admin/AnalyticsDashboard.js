"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import toast from "react-hot-toast";
import api from "../../utils/api.js";

const KPI = ({ label, value, hint }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40"
  >
    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
    <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
    {hint && <p className="mt-1 text-[11px] font-medium text-zinc-500">{hint}</p>}
  </motion.div>
);

const Panel = ({ title, children, action }) => (
  <div className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wider">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const AnalyticsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [range, setRange] = useState("month");
  const [loading, setLoading] = useState(true);

  const load = async (r = range) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/stats?range=${r}`);
      if (res.data.success) setStats(res.data.stats);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load(range);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  if (loading && !stats) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-xs font-bold uppercase tracking-wider text-zinc-400">
        Loading analytics...
      </div>
    );
  }

  if (!stats) return null;

  const rangeToggle = (
    <div className="flex gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
      {["day", "week", "month"].map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
            range === r
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-zinc-500"
          }`}
        >
          {r === "day" ? "Daily" : r === "week" ? "Weekly" : "Monthly"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider">Analytics Overview</h2>
          <p className="text-xs text-zinc-500">Live metrics from orders, customers, and inventory</p>
        </div>
        {rangeToggle}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KPI label="Total Revenue" value={`₹${Number(stats.revenue || 0).toLocaleString()}`} />
        <KPI label="Total Orders" value={stats.ordersCount || 0} />
        <KPI label="Total Customers" value={stats.customersCount || 0} />
        <KPI label="Total Products" value={stats.productsCount || 0} />
        <KPI
          label="Sales Today"
          value={`₹${Number(stats.salesToday || 0).toLocaleString()}`}
          hint={`${stats.salesTodayOrders || 0} orders`}
        />
        <KPI label="Monthly Revenue" value={`₹${Number(stats.monthlyRevenue || 0).toLocaleString()}`} />
        <KPI label="Pending Orders" value={stats.pendingOrders || 0} />
        <KPI label="Cancelled Orders" value={stats.cancelledOrders || 0} />
        <KPI label="Low Stock" value={stats.lowStockCount || 0} />
        <KPI label="Out of Stock" value={stats.outOfStockCount || 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Revenue Chart">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueSeries || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#18181b" fill="#18181b" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Orders Chart">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ordersSeries || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#18181b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Sales Trend">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.salesTrend || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="sales" name="Revenue" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.12} />
                <Area type="monotone" dataKey="orders" name="Orders" stroke="#0891b2" fill="#0891b2" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Customer Growth">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.customerGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="customers" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Top Selling Products">
          <div className="space-y-3">
            {(stats.topSellingProducts || []).map((p) => (
              <div key={p._id || p.title} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image || "/logo.png"} alt="" className="h-10 w-10 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{p.title}</p>
                  <p className="text-[11px] text-zinc-500">{p.units} sold · ₹{p.revenue}</p>
                </div>
              </div>
            ))}
            {!stats.topSellingProducts?.length && (
              <p className="text-xs text-zinc-400">No sales data yet</p>
            )}
          </div>
        </Panel>

        <Panel title="Recent Orders">
          <div className="space-y-3">
            {(stats.recentOrders || []).map((o) => (
              <div key={o._id} className="flex items-start justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold">#{o.orderNumber}</p>
                  <p className="text-zinc-500">{o.customer?.name || "Customer"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{o.pricing?.total}</p>
                  <p className="text-[10px] uppercase text-zinc-400">{o.orderStatus}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Latest Customers">
          <div className="space-y-3">
            {(stats.latestCustomers || []).map((u) => (
              <div key={u._id} className="text-xs">
                <p className="font-bold">{u.name}</p>
                <p className="text-zinc-500">{u.email}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top Categories">
          <div className="space-y-2">
            {(stats.topCategories || []).map((c) => (
              <div key={c.name} className="flex justify-between text-xs font-semibold">
                <span>{c.name}</span>
                <span className="text-zinc-500">₹{c.revenue}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Best Selling Brands">
          <div className="space-y-2">
            {(stats.topBrands || []).map((b) => (
              <div key={b.name} className="flex justify-between text-xs font-semibold">
                <span>{b.name}</span>
                <span className="text-zinc-500">{b.units} units</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Recent Activity Timeline">
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {(stats.activityTimeline || []).map((a, i) => (
              <div key={`${a.type}-${i}`} className="border-l-2 border-zinc-200 pl-3 dark:border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{a.type}</p>
                <p className="text-xs font-bold">{a.title}</p>
                <p className="text-[11px] text-zinc-500">{a.meta}</p>
                <p className="text-[10px] text-zinc-400">
                  {a.at ? new Date(a.at).toLocaleString() : ""}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
