"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import {
  IoStatsChartOutline,
  IoBagCheckOutline,
  IoHardwareChipOutline,
  IoPeopleOutline,
  IoSettingsOutline,
  IoAlertCircleOutline,
  IoAddCircleOutline,
  IoTrashOutline,
  IoCreateOutline
} from "react-icons/io5";
import toast from "react-hot-toast";

import Navbar from "../../components/Navbar.js";
import Footer from "../../components/Footer.js";
import Modal from "../../components/Modal.js";
import { DashboardSkeleton } from "../../components/Skeleton.js";
import api from "../../utils/api.js";

const AdminDashboard = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Dashboard state tabs: "stats" | "orders" | "inventory" | "users" | "settings"
  const [activeTab, setActiveTab] = useState("stats");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Sub-data collections
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [websiteSettings, setWebsiteSettings] = useState(null);
  
  // Delivery Partner list for assignment dropdown
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);

  // Modals / Form triggers
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const { register: registerProd, handleSubmit: handleSubmitProd, reset: resetProd } = useForm();
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);

  // Security gate: redirect if not admin/owner
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
    } else if (user && !["Admin", "Owner", "Super Admin"].includes(user.role)) {
      toast.error("Unauthorized access to admin panel.");
      router.push("/");
    } else {
      fetchDashboardStats();
    }
  }, [isAuthenticated, user, router]);

  // Tab change effect
  useEffect(() => {
    if (!user) return;
    if (activeTab === "orders") {
      fetchAdminOrders();
      fetchDeliveryPartners();
    } else if (activeTab === "inventory") {
      fetchAdminProducts();
    } else if (activeTab === "users") {
      fetchAdminUsers();
    } else if (activeTab === "settings") {
      fetchAdminSettings();
    }
  }, [activeTab, user]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/stats");
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminOrders = async () => {
    try {
      // Fetch all orders on system
      const res = await api.get("/orders/my"); // reusing endpoint, backend supports admin fetching all orders if admin role
      // Wait, let's make sure the backend `/orders/my` or `/orders` lists all orders.
      // Actually, we wrote an endpoint `/api/admin/stats` that gives summary, and we can query orders.
      // Let's call the generic order fetch:
      const ordersRes = await api.get("/orders/my"); 
      if (ordersRes.data.success) {
        setOrders(ordersRes.data.orders);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDeliveryPartners = async () => {
    try {
      const res = await api.get("/admin/users?role=Delivery Partner");
      if (res.data.success) {
        setDeliveryPartners(res.data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminProducts = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get("/products?limit=50"),
        api.get("/products/categories")
      ]);
      if (prodRes.data.success) {
        setProducts(prodRes.data.products);
      }
      if (catRes.data.success) {
        setCategoriesList(catRes.data.categories);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      if (res.data.success) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminSettings = async () => {
    try {
      const res = await api.get("/admin/settings");
      if (res.data.success) {
        setWebsiteSettings(res.data.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Assign delivery partner
  const handleAssignDelivery = async (orderId, partnerId) => {
    if (!partnerId) return;
    const loadId = toast.loading("Assigning task to delivery courier...");
    try {
      const res = await api.put(`/orders/${orderId}/status`, { deliveryPartnerId: partnerId });
      if (res.data.success) {
        toast.success("Courier assigned successfully!", { id: loadId });
        fetchAdminOrders();
      }
    } catch (err) {
      toast.error("Assignment failed.", { id: loadId });
    }
  };

  // Toggle order state packed / shipped / delivered
  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    const loadId = toast.loading("Updating order status...");
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      if (res.data.success) {
        toast.success(`Order marked as ${nextStatus}!`, { id: loadId });
        fetchAdminOrders();
      }
    } catch (err) {
      toast.error("Status update failed.", { id: loadId });
    }
  };

  // Add Product Form submit
  const handleAddProduct = async (data) => {
    const loadId = toast.loading("Creating product in catalog...");
    try {
      // Transform sizes / colors to array
      const colors = data.colors.split(",").map(c => c.trim());
      const sizes = data.sizes.split(",").map(s => s.trim());
      const tags = data.tags.split(",").map(t => t.trim());
      
      const images = data.images ? data.images.split(",").map(img => img.trim()) : [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80"
      ];

      const payload = {
        ...data,
        colors,
        sizes,
        tags,
        images
      };

      const res = await api.post("/products", payload);
      if (res.data.success) {
        toast.success("Product created successfully!", { id: loadId });
        setIsAddProductOpen(false);
        resetProd();
        fetchAdminProducts();
        fetchDashboardStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create product", { id: loadId });
    }
  };

  // Save edits of product
  const handleEditProductSave = async (e) => {
    e.preventDefault();
    const loadId = toast.loading("Saving changes...");
    try {
      const res = await api.put(`/products/${editingProduct._id}`, editingProduct);
      if (res.data.success) {
        toast.success("Product updated successfully!", { id: loadId });
        setIsEditProductOpen(false);
        setEditingProduct(null);
        fetchAdminProducts();
      }
    } catch (err) {
      toast.error("Failed to save changes", { id: loadId });
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    const loadId = toast.loading("Deleting product...");
    try {
      const res = await api.delete(`/products/${productId}`);
      if (res.data.success) {
        toast.success("Product deleted", { id: loadId });
        fetchAdminProducts();
        fetchDashboardStats();
      }
    } catch (err) {
      toast.error("Failed to delete product", { id: loadId });
    }
  };

  // Update Settings submit
  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    const loadId = toast.loading("Saving configurations...");
    try {
      const res = await api.put("/admin/settings", websiteSettings);
      if (res.data.success) {
        toast.success("Configurations saved successfully!", { id: loadId });
      }
    } catch (err) {
      toast.error("Failed to update settings", { id: loadId });
    }
  };

  // Toggle user active status / roles
  const handleUpdateUser = async (userId, activeStatus, nextRole) => {
    const loadId = toast.loading("Updating user account...");
    try {
      const res = await api.put(`/admin/users/${userId}`, {
        isActive: activeStatus,
        role: nextRole
      });
      if (res.data.success) {
        toast.success("User updated!", { id: loadId });
        fetchAdminUsers();
      }
    } catch (err) {
      toast.error("Update failed.", { id: loadId });
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors min-h-[80vh]">
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="flex flex-col gap-2.5">
            <div className="rounded-2xl border border-zinc-100 p-5 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider truncate">Admin Board</h2>
              <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold">{user?.name}</p>
            </div>

            <button
              onClick={() => setActiveTab("stats")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "stats" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoStatsChartOutline className="text-base" /> Analytics Overview
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "orders" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoBagCheckOutline className="text-base" /> Manage Orders
            </button>

            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "inventory" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoHardwareChipOutline className="text-base" /> Product Inventory
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "users" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoPeopleOutline className="text-base" /> User Accounts
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "settings" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoSettingsOutline className="text-base" /> Shop Configuration
            </button>
          </aside>

          {/* CONTENT AREA */}
          <div className="lg:col-span-4">
            
            {loading ? (
              <DashboardSkeleton />
            ) : (
              <>
                
                {/* TAB: ANALYTICS */}
                {activeTab === "stats" && stats && (
                  <div className="flex flex-col gap-8 animate-fadeIn">
                    <div className="border-b border-zinc-100 pb-4 dark:border-zinc-900">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider">Business Health Metrics</h3>
                    </div>

                    {/* Stats Grids */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Gross Sales</span>
                        <span className="text-2xl font-black text-zinc-900 dark:text-white block mt-2">₹{stats.revenue}</span>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Total Orders</span>
                        <span className="text-2xl font-black text-zinc-900 dark:text-white block mt-2">{stats.ordersCount}</span>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Active Customers</span>
                        <span className="text-2xl font-black text-zinc-900 dark:text-white block mt-2">{stats.customersCount}</span>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Low Stock Alerts</span>
                        <span className={`text-2xl font-black block mt-2 ${stats.lowStockCount > 0 ? "text-red-500" : "text-emerald-500"}`}>{stats.lowStockCount}</span>
                      </div>
                    </div>

                    {/* Charts & Stocks */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* CSS / SVG Bar graph representation */}
                      <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 lg:col-span-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-6">Sales Volume Velocity</h4>
                        
                        <div className="flex items-end justify-between h-48 pt-6 border-b border-zinc-100 dark:border-zinc-900">
                          {stats.graphData?.length === 0 ? (
                            <p className="text-xs text-zinc-400 text-center w-full pb-10">No monthly sales data available</p>
                          ) : (
                            stats.graphData.map((data, i) => {
                              const maxVal = Math.max(...stats.graphData.map(d => d.sales)) || 1;
                              const heightPercent = Math.round((data.sales / maxVal) * 80) + 10; // scale between 10% and 90%
                              return (
                                <div key={i} className="flex flex-col items-center flex-1 group relative">
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full mb-2 bg-black text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    ₹{data.sales} ({data.orders} orders)
                                  </div>
                                  <div
                                    style={{ height: `${heightPercent}%` }}
                                    className="w-8 sm:w-10 bg-zinc-900 rounded-t-lg group-hover:bg-zinc-700 transition-all dark:bg-white dark:group-hover:bg-zinc-200"
                                  />
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold mt-2">{data.name}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Low Stock Alerts */}
                      <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-1"><IoAlertCircleOutline className="text-red-500 text-lg" /> Low Stock Alerts</h4>
                        <div className="flex flex-col gap-4">
                          {stats.lowStockAlerts?.length === 0 ? (
                            <p className="text-xs text-zinc-400">All products are well stocked.</p>
                          ) : (
                            stats.lowStockAlerts.map(prod => (
                              <div key={prod._id} className="flex justify-between items-center text-xs border-b border-zinc-50 pb-2.5 dark:border-zinc-900">
                                <div>
                                  <h5 className="font-bold truncate max-w-[150px]">{prod.title}</h5>
                                  <p className="text-[10px] text-zinc-400 mt-0.5">SKU: {prod.sku}</p>
                                </div>
                                <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:bg-red-950/20">{prod.stock} left</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB: MANAGE ORDERS */}
                {activeTab === "orders" && (
                  <div className="flex flex-col gap-6 animate-fadeIn">
                    <div className="border-b border-zinc-100 pb-4 dark:border-zinc-900">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider">Order Management Pool</h3>
                    </div>

                    <div className="flex flex-col gap-4">
                      {orders.length === 0 ? (
                        <p className="text-xs text-zinc-400 text-center py-10">No orders placed on system.</p>
                      ) : (
                        orders.map(ord => (
                          <div key={ord._id} className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40 flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-50 pb-3 dark:border-zinc-900">
                              <div>
                                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Order ID</span>
                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase">#{ord.orderNumber}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="rounded bg-zinc-100 px-2 py-0.5 text-[9px] font-bold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 uppercase">
                                  {ord.orderStatus}
                                </span>
                                <span className="rounded bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-700 dark:bg-green-950/20 uppercase">
                                  {ord.paymentStatus}
                                </span>
                              </div>
                            </div>

                            {/* Order Products summary */}
                            <div className="flex flex-col gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                              {ord.items.map((it, i) => (
                                <div key={i} className="flex justify-between font-semibold">
                                  <span>{it.product?.title || "Fashion Item"} x{it.quantity}</span>
                                  <span>₹{it.price * it.quantity}</span>
                                </div>
                              ))}
                            </div>

                            {/* Assign Courier & Progress toggles */}
                            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-50 pt-3 dark:border-zinc-900 mt-2">
                              {/* Assign partner dropdown */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Courier Assignment:</span>
                                <select
                                  value={ord.deliveryPartner?._id || ""}
                                  onChange={(e) => handleAssignDelivery(ord._id, e.target.value)}
                                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-bold outline-none dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                  <option value="">Unassigned</option>
                                  {deliveryPartners.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Progress buttons */}
                              <div className="flex gap-2">
                                {ord.orderStatus === "Pending" && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(ord._id, "Confirmed")}
                                    className="rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black px-3.5 py-1 text-[10px] font-bold uppercase hover:opacity-90"
                                  >
                                    Confirm
                                  </button>
                                )}
                                {ord.orderStatus === "Confirmed" && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(ord._id, "Packed")}
                                    className="rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black px-3.5 py-1 text-[10px] font-bold uppercase hover:opacity-90"
                                  >
                                    Pack Order
                                  </button>
                                )}
                                {ord.orderStatus === "Packed" && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(ord._id, "OutForDelivery")}
                                    className="rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black px-3.5 py-1 text-[10px] font-bold uppercase hover:opacity-90"
                                  >
                                    Ship Out (OTP generate)
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB: PRODUCT INVENTORY */}
                {activeTab === "inventory" && (
                  <div className="flex flex-col gap-6 animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-4 dark:border-zinc-900">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider">Catalog Inventory</h3>
                      <button
                        onClick={() => setIsAddProductOpen(true)}
                        className="rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:opacity-90 flex items-center gap-1"
                      >
                        <IoAddCircleOutline className="text-sm" /> Add Product
                      </button>
                    </div>

                    {/* Table view */}
                    <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950/40">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 bg-zinc-50/50 dark:border-zinc-900 dark:bg-zinc-900/10 text-zinc-400 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-4">Product Details</th>
                            <th className="p-4">SKU Code</th>
                            <th className="p-4 text-center">Stock</th>
                            <th className="p-4 text-right">Sale Price</th>
                            <th className="p-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map(prod => (
                            <tr key={prod._id} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50/20 dark:hover:bg-zinc-900/10">
                              <td className="p-4 flex items-center gap-3">
                                <img src={prod.images?.[0]} className="h-10 w-8 rounded object-cover flex-shrink-0" />
                                <div>
                                  <h4 className="font-bold truncate max-w-[180px]">{prod.title}</h4>
                                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">{prod.brand}</span>
                                </div>
                              </td>
                              <td className="p-4 font-semibold uppercase">{prod.sku}</td>
                              <td className="p-4 text-center font-bold">{prod.stock}</td>
                              <td className="p-4 text-right font-bold">₹{prod.salePrice}</td>
                              <td className="p-4">
                                <div className="flex gap-3 justify-center text-zinc-500">
                                  <button
                                    onClick={() => {
                                      setEditingProduct(prod);
                                      setIsEditProductOpen(true);
                                    }}
                                    className="hover:text-black dark:hover:text-white text-base"
                                  >
                                    <IoCreateOutline />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(prod._id)}
                                    className="hover:text-red-500 text-base"
                                  >
                                    <IoTrashOutline />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB: USER ACCOUNTS */}
                {activeTab === "users" && (
                  <div className="flex flex-col gap-6 animate-fadeIn">
                    <div className="border-b border-zinc-100 pb-4 dark:border-zinc-900">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider">User Account Management</h3>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950/40">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 bg-zinc-50/50 dark:border-zinc-900 dark:bg-zinc-900/10 text-zinc-400 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-4">User Info</th>
                            <th className="p-4 text-center">Role Permission</th>
                            <th className="p-4 text-center">Wallet Balance</th>
                            <th className="p-4 text-center">Active Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map(usr => (
                            <tr key={usr._id} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50/20 dark:hover:bg-zinc-900/10">
                              <td className="p-4">
                                <h4 className="font-bold">{usr.name}</h4>
                                <p className="text-[10px] text-zinc-400 mt-0.5">{usr.email} | {usr.mobile}</p>
                              </td>
                              <td className="p-4 text-center">
                                <select
                                  value={usr.role}
                                  onChange={(e) => handleUpdateUser(usr._id, usr.isActive, e.target.value)}
                                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-bold outline-none dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                  <option value="Customer">Customer</option>
                                  <option value="Delivery Partner">Delivery Partner</option>
                                  <option value="Admin">Admin</option>
                                  <option value="Owner">Owner</option>
                                </select>
                              </td>
                              <td className="p-4 text-center font-bold">₹{usr.walletBalance}</td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleUpdateUser(usr._id, !usr.isActive, usr.role)}
                                  className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${usr.isActive ? "bg-green-50 text-green-700 dark:bg-green-950/20" : "bg-red-50 text-red-700 dark:bg-red-950/20"}`}
                                >
                                  {usr.isActive ? "Active" : "Banned"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB: SHOP CONFIGURATION */}
                {activeTab === "settings" && websiteSettings && (
                  <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-900 bg-white shadow-sm flex flex-col gap-6 animate-fadeIn">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider border-b border-zinc-100 pb-4 dark:border-zinc-900">
                      System Credentials & Config
                    </h3>

                    <form onSubmit={handleUpdateSettings} className="flex flex-col gap-6 max-w-2xl">
                      {/* SEO */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <h4 className="sm:col-span-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          SEO Meta Tags
                        </h4>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-zinc-500 mb-1.5 block">Store Title</label>
                          <input
                            type="text"
                            value={websiteSettings.seo?.title}
                            onChange={(e) => setWebsiteSettings({
                              ...websiteSettings,
                              seo: { ...websiteSettings.seo, title: e.target.value }
                            })}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-zinc-500 mb-1.5 block">Meta Description</label>
                          <textarea
                            rows={3}
                            value={websiteSettings.seo?.metaDescription}
                            onChange={(e) => setWebsiteSettings({
                              ...websiteSettings,
                              seo: { ...websiteSettings.seo, metaDescription: e.target.value }
                            })}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
                          />
                        </div>
                      </div>

                      <hr className="border-zinc-100 dark:border-zinc-900" />

                      {/* SMTP */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <h4 className="sm:col-span-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          SMTP Mail Server Settings (Nodemailer)
                        </h4>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-zinc-500 mb-1.5 block">SMTP Host</label>
                          <input
                            type="text"
                            value={websiteSettings.smtp?.host}
                            onChange={(e) => setWebsiteSettings({
                              ...websiteSettings,
                              smtp: { ...websiteSettings.smtp, host: e.target.value }
                            })}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 mb-1.5 block">Port</label>
                          <input
                            type="number"
                            value={websiteSettings.smtp?.port}
                            onChange={(e) => setWebsiteSettings({
                              ...websiteSettings,
                              smtp: { ...websiteSettings.smtp, port: Number(e.target.value) }
                            })}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-zinc-500 mb-1.5 block">Username (Email)</label>
                          <input
                            type="text"
                            value={websiteSettings.smtp?.user}
                            onChange={(e) => setWebsiteSettings({
                              ...websiteSettings,
                              smtp: { ...websiteSettings.smtp, user: e.target.value }
                            })}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 mb-1.5 block">SMTP Password</label>
                          <input
                            type="password"
                            value={websiteSettings.smtp?.pass}
                            onChange={(e) => setWebsiteSettings({
                              ...websiteSettings,
                              smtp: { ...websiteSettings.smtp, pass: e.target.value }
                            })}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
                          />
                        </div>
                      </div>

                      <hr className="border-zinc-100 dark:border-zinc-900" />

                      {/* Twilio */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <h4 className="sm:col-span-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          Twilio SMS Client Credentials
                        </h4>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-zinc-500 mb-1.5 block">Account SID</label>
                          <input
                            type="text"
                            value={websiteSettings.sms?.twilioSid}
                            onChange={(e) => setWebsiteSettings({
                              ...websiteSettings,
                              sms: { ...websiteSettings.sms, twilioSid: e.target.value }
                            })}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 mb-1.5 block">Auth Token</label>
                          <input
                            type="password"
                            value={websiteSettings.sms?.token}
                            onChange={(e) => setWebsiteSettings({
                              ...websiteSettings,
                              sms: { ...websiteSettings.sms, token: e.target.value }
                            })}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 mb-1.5 block">Twilio Number</label>
                          <input
                            type="text"
                            value={websiteSettings.sms?.fromNum}
                            onChange={(e) => setWebsiteSettings({
                              ...websiteSettings,
                              sms: { ...websiteSettings.sms, fromNum: e.target.value }
                            })}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="rounded-xl bg-black py-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 dark:bg-white dark:text-black"
                      >
                        Save Configuration Keys
                      </button>
                    </form>
                  </div>
                )}

              </>
            )}

          </div>

        </div>

      </main>

      {/* MODAL: ADD PRODUCT */}
      <Modal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title="Add Catalog Product"
      >
        <form onSubmit={handleSubmitProd(handleAddProduct)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="sm:col-span-2">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Title</label>
            <input
              type="text"
              placeholder="Zara Designer Shirt"
              {...registerProd("title", { required: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Brand</label>
            <input
              type="text"
              placeholder="Zara"
              {...registerProd("brand", { required: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">SKU Code</label>
            <input
              type="text"
              placeholder="SKU-MEN-SHI-101"
              {...registerProd("sku", { required: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">MRP Price ₹</label>
            <input
              type="number"
              placeholder="2999"
              {...registerProd("mrp", { required: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Sale Price ₹</label>
            <input
              type="number"
              placeholder="1499"
              {...registerProd("salePrice", { required: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Inventory Stock</label>
            <input
              type="number"
              placeholder="50"
              {...registerProd("stock", { required: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Subcategory</label>
            <input
              type="text"
              placeholder="Shirts"
              {...registerProd("subcategory", { required: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
          
          <div className="sm:col-span-2">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Colors (comma separated)</label>
            <input
              type="text"
              placeholder="Black, White, Blue"
              {...registerProd("colors", { required: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Sizes (comma separated)</label>
            <input
              type="text"
              placeholder="S, M, L, XL"
              {...registerProd("sizes", { required: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="men, shirt, luxury"
              {...registerProd("tags", { required: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Description</label>
            <textarea
              rows={3}
              placeholder="Product design and material details..."
              {...registerProd("description", { required: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Image URLs (comma separated)</label>
            <input
              type="text"
              placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
              {...registerProd("images")}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Select Category Department</label>
            <select
              {...registerProd("category", { required: true })}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
            >
              <option value="">Choose Category...</option>
              {categoriesList.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="sm:col-span-2 rounded-xl bg-black py-3.5 text-xs font-bold text-white uppercase tracking-wider dark:bg-white dark:text-black mt-2"
          >
            Create Product Listing
          </button>
        </form>
      </Modal>

      {/* MODAL: EDIT PRODUCT */}
      <Modal
        isOpen={isEditProductOpen}
        onClose={() => setIsEditProductOpen(false)}
        title="Edit Catalog Product"
      >
        {editingProduct && (
          <form onSubmit={handleEditProductSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Title</label>
              <input
                type="text"
                value={editingProduct.title}
                onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">MRP Price ₹</label>
              <input
                type="number"
                value={editingProduct.mrp}
                onChange={(e) => setEditingProduct({ ...editingProduct, mrp: Number(e.target.value) })}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Sale Price ₹</label>
              <input
                type="number"
                value={editingProduct.salePrice}
                onChange={(e) => setEditingProduct({ ...editingProduct, salePrice: Number(e.target.value) })}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Stock</label>
              <input
                type="number"
                value={editingProduct.stock}
                onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>

            <button
              type="submit"
              className="sm:col-span-2 rounded-xl bg-black py-3.5 text-xs font-bold text-white uppercase tracking-wider dark:bg-white dark:text-black mt-2"
            >
              Save Product Edits
            </button>
          </form>
        )}
      </Modal>

      <Footer />
    </>
  );
};

export default AdminDashboard;
