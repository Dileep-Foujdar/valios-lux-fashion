"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  IoTrendingUpOutline,
  IoWalletOutline,
  IoPieChartOutline,
  IoBriefcaseOutline,
  IoCardOutline,
  IoReceiptOutline,
  IoArrowDownOutline,
  IoArrowUpOutline
} from "react-icons/io5";
import toast from "react-hot-toast";

import Navbar from "../../components/Navbar.js";
import Footer from "../../components/Footer.js";
import { DashboardSkeleton } from "../../components/Skeleton.js";
import api from "../../utils/api.js";

const OwnerDashboard = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [businessData, setBusinessData] = useState(null);
  const [employees, setEmployees] = useState([]);

  // Check roles: Owner or Super Admin
  const fetchBusinessAnalytics = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users")
      ]);

      if (statsRes.data.success) {
        setBusinessData(statsRes.data.stats);
      }
      if (usersRes.data.success) {
        const staff = usersRes.data.users.filter(u => ["Admin", "Delivery Partner"].includes(u.role));
        setEmployees(staff);
      }
    } catch (err) {
      toast.error("Failed to load business reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
    } else if (user && !["Owner", "Super Admin"].includes(user.role)) {
      toast.error("Unauthorized access. Owner permissions required.");
      router.push("/");
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchBusinessAnalytics();
    }
  }, [isAuthenticated, user, router]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors min-h-[80vh]">
        
        <div className="border-b border-zinc-100 pb-6 dark:border-zinc-900 mb-8">
          <h1 className="text-xl font-extrabold uppercase tracking-wider">Owner Dashboard</h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">
            Financial analytics, gross margins, payroll distributions, and business metrics
          </p>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : !businessData ? (
          <p className="text-xs text-zinc-400 text-center py-20">Analytics data unavailable.</p>
        ) : (
          <div className="flex flex-col gap-10">
            
            {/* 1. FINANCIAL REPORT TILES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Gross Revenue */}
              <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Gross Revenue</span>
                    <h3 className="text-2xl font-black mt-2">₹{businessData.revenue}</h3>
                  </div>
                  <span className="text-emerald-500 text-lg flex items-center bg-emerald-50 p-1.5 rounded-full dark:bg-emerald-950/20">
                    <IoTrendingUpOutline />
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                  <IoArrowUpOutline /> <span>+12.4% vs last month</span>
                </div>
              </div>

              {/* Gross Margins */}
              <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Gross Margin (40%)</span>
                    <h3 className="text-2xl font-black mt-2">₹{businessData.business?.profit}</h3>
                  </div>
                  <span className="text-blue-500 text-lg flex items-center bg-blue-50 p-1.5 rounded-full dark:bg-blue-950/20">
                    <IoPieChartOutline />
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[10px] text-blue-600 font-bold">
                  <span>Product markup: 1.6x average</span>
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Expenses & Payroll</span>
                    <h3 className="text-2xl font-black mt-2">₹{businessData.business?.expenses}</h3>
                  </div>
                  <span className="text-red-500 text-lg flex items-center bg-red-50 p-1.5 rounded-full dark:bg-red-950/20">
                    <IoCardOutline />
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[10px] text-red-600 font-bold">
                  <IoArrowDownOutline /> <span>Includes ₹{businessData.business?.employeeCount * 25000} salaries</span>
                </div>
              </div>

              {/* Net Profits */}
              <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Net Profit</span>
                    <h3 className={`text-2xl font-black mt-2 ${businessData.business?.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      ₹{businessData.business?.netProfit}
                    </h3>
                  </div>
                  <span className="text-amber-500 text-lg flex items-center bg-amber-50 p-1.5 rounded-full dark:bg-amber-950/20">
                    <IoWalletOutline />
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold">
                  <span>After ops & payroll deductions</span>
                </div>
              </div>

            </div>

            {/* 2. REVENUE GRAPHS & DISTRIBUTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Financial comparison graphic */}
              <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 lg:col-span-2">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-1.5">
                  <IoReceiptOutline /> Financial Overhead Breakdown
                </h4>
                
                {/* Simulated Stacked Bars */}
                <div className="flex flex-col gap-6 pt-4">
                  {/* Revenue */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span>Total Revenue Sales</span>
                      <span>₹{businessData.revenue} (100%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-3.5 dark:bg-zinc-900 overflow-hidden">
                      <div className="bg-zinc-900 dark:bg-white h-full rounded-full" style={{ width: "100%" }}></div>
                    </div>
                  </div>

                  {/* COGS (Cost of goods sold - 60% standard) */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span>Cost of Goods Sold (C.O.G.S.)</span>
                      <span>₹{Math.round(businessData.revenue * 0.60)} (60%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-3.5 dark:bg-zinc-900 overflow-hidden">
                      <div className="bg-zinc-400 h-full rounded-full" style={{ width: "60%" }}></div>
                    </div>
                  </div>

                  {/* Operational Expenses */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span>Operations & Payroll Overheads</span>
                      <span>₹{businessData.business?.expenses} ({( (businessData.business?.expenses / (businessData.revenue || 1)) * 100 ).toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-3.5 dark:bg-zinc-900 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(businessData.business?.expenses / (businessData.revenue || 1)) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Net Margin */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span>Net Margins Profit</span>
                      <span className="text-emerald-600">₹{businessData.business?.netProfit} ({( (businessData.business?.netProfit / (businessData.revenue || 1)) * 100 ).toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-3.5 dark:bg-zinc-900 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(businessData.business?.netProfit / (businessData.revenue || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Category distribution */}
              <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 flex flex-col justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-1.5">
                  <IoPieChartOutline /> Catalog Share
                </h4>
                <div className="flex flex-col gap-3">
                  {businessData.categoryShare?.map((share, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-semibold border-b border-zinc-50 pb-2.5 dark:border-zinc-900">
                      <span>{share.name}</span>
                      <span className="rounded bg-zinc-100 px-2 py-0.5 font-bold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">{share.value} items</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* 3. STAFF & EMPLOYEE DIRECTORY */}
            <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-1.5">
                <IoBriefcaseOutline /> Staff Directory & Payroll Config
              </h4>

              <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-900">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50 dark:border-zinc-900 text-zinc-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Role Permission</th>
                      <th className="p-4">Contact Phone</th>
                      <th className="p-4 text-right">Standard Payroll / Trip Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-zinc-400">No employees listed.</td>
                      </tr>
                    ) : (
                      employees.map(emp => (
                        <tr key={emp._id} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50/20 dark:hover:bg-zinc-900/10">
                          <td className="p-4">
                            <h4 className="font-bold">{emp.name}</h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5">{emp.email}</p>
                          </td>
                          <td className="p-4">
                            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[9px] font-bold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                              {emp.role}
                            </span>
                          </td>
                          <td className="p-4">{emp.mobile}</td>
                          <td className="p-4 text-right font-bold text-zinc-800 dark:text-zinc-200">
                            {emp.role === "Admin" ? "₹35,000 / month" : "₹60 / delivery trip"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>
      <Footer />
    </>
  );
};

export default OwnerDashboard;
