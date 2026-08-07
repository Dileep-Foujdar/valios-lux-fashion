"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { io } from "socket.io-client";
import {
  IoStatsChartOutline,
  IoBagCheckOutline,
  IoHardwareChipOutline,
  IoPeopleOutline,
  IoSettingsOutline,
  IoChatbubbleEllipsesOutline,
  IoAlbumsOutline,
  IoBicycleOutline,
  IoNavigateOutline
} from "react-icons/io5";
import toast from "react-hot-toast";

import Navbar from "../../components/Navbar.js";
import Footer from "../../components/Footer.js";
import Modal from "../../components/Modal.js";
import { DashboardSkeleton } from "../../components/Skeleton.js";
import api from "../../utils/api.js";
import AnalyticsDashboard from "../../components/admin/AnalyticsDashboard.js";
import ProductInventory from "../../components/admin/ProductInventory.js";
import CatalogManager from "../../components/admin/CatalogManager.js";
import DeliveryOps from "../../components/admin/DeliveryOps.js";
import { DEFAULT_PRODUCT_VISIBILITY, VISIBILITY_LABELS } from "../../utils/productDisplay.js";

const AdminDashboardInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Dashboard tabs from URL
  const VALID_TABS = ["stats", "orders", "inventory", "catalog", "partners", "deliveries", "users", "settings"];
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : "stats";
  const setActiveTab = (tab) => {
    const next = VALID_TABS.includes(tab) ? tab : "stats";
    router.replace(`/admin?tab=${next}`, { scroll: false });
  };
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

  // Chat system states
  const [chatOrder, setChatOrder] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);

  // ── Fetch helpers (declared before useEffects to satisfy hoisting rules) ──

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
      const ordersRes = await api.get("/orders");
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

  // Security gate: redirect if not admin/owner
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
    } else if (user && !["Admin", "Owner", "Super Admin"].includes(user.role)) {
      toast.error("Unauthorized access to admin panel.");
      router.push("/");
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDashboardStats();
    }
  }, [isAuthenticated, user, router]);

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!user || !["Admin", "Owner", "Super Admin"].includes(user.role)) return;

    const socketUrl = typeof window !== "undefined" ? window.location.origin : "";
    const socket = io(socketUrl);

    socket.on("connect", () => {
      console.log("Admin connected to socket");
      socket.emit("join", { userId: user._id, role: user.role });
    });

    socket.on("newOrder", (data) => {
      toast.success(`New Order Received: #${data.orderNumber} (₹${data.total})`, {
        icon: "🛍️",
        duration: 5000
      });
      // Fetch latest orders & stats in real-time
      fetchAdminOrders();
      fetchDashboardStats();
    });

    socket.on("customerChatMessage", (message) => {
      toast(`New Chat from ${message.sender?.name || "Customer"}`, {
        icon: "💬",
        duration: 4000
      });
      // Refresh orders list to show the unread badge in real-time
      fetchAdminOrders();
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Socket connection for order chat
  useEffect(() => {
    if (!chatOrder) return;

    // Load past messages
    const fetchChatMessages = async () => {
      try {
        const res = await api.get(`/orders/${chatOrder._id}/messages`);
        if (res.data.success) {
          setChatMessages(res.data.messages);
        }
      } catch (err) {
        toast.error("Failed to load chat history");
      }
    };

    fetchChatMessages();

    // Setup Socket
    const socket = io();
    socket.emit("join", { userId: user?._id, role: user?.role });
    socket.emit("joinOrderChat", { orderId: chatOrder._id });

    socket.on("newChatMessage", (message) => {
      if (message.order === chatOrder._id) {
        setChatMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      socket.emit("leaveOrderChat", { orderId: chatOrder._id });
      socket.disconnect();
    };
  }, [chatOrder, user]);

  // Send chat message handler
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !chatOrder) return;

    try {
      const res = await api.post(`/orders/${chatOrder._id}/messages`, {
        message: newMessageText.trim()
      });
      if (res.data.success) {
        setNewMessageText("");
      }
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  // Tab change effect
  useEffect(() => {
    if (!user) return;
    if (activeTab === "orders") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAdminOrders();
      fetchDeliveryPartners();
    } else if (activeTab === "users") {
      fetchAdminUsers();
    } else if (activeTab === "settings") {
      fetchAdminSettings();
    }
  }, [activeTab, user]);

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
              onClick={() => setActiveTab("catalog")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "catalog" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoAlbumsOutline className="text-base" /> Catalog Manager
            </button>

            <button
              onClick={() => setActiveTab("partners")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "partners" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoBicycleOutline className="text-base" /> Delivery Partners
            </button>

            <button
              onClick={() => setActiveTab("deliveries")}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-left transition-all ${activeTab === "deliveries" ? "bg-black text-white dark:bg-white dark:text-black shadow-md" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500"}`}
            >
              <IoNavigateOutline className="text-base" /> Delivery Management
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
            
            {activeTab === "stats" ? (
              <AnalyticsDashboard />
            ) : activeTab === "inventory" ? (
              <ProductInventory />
            ) : activeTab === "catalog" ? (
              <CatalogManager />
            ) : activeTab === "partners" ? (
              <DeliveryOps section="partners" />
            ) : activeTab === "deliveries" ? (
              <DeliveryOps section="deliveries" />
            ) : loading ? (
              <DashboardSkeleton />
            ) : (
              <>

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

                                {/* Chat with customer */}
                                <button
                                  onClick={() => {
                                    setChatOrder(ord);
                                    ord.adminUnread = false;
                                  }}
                                  className={`rounded-lg px-3.5 py-1 text-[10px] font-bold uppercase flex items-center gap-1.5 transition-all ${ord.adminUnread ? "bg-emerald-500 text-white animate-pulse" : "border border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"}`}
                                >
                                  <IoChatbubbleEllipsesOutline /> Chat {ord.adminUnread && <span className="h-1.5 w-1.5 rounded-full bg-white block" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
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

                    <form onSubmit={handleUpdateSettings} className="flex flex-col gap-6 max-w-3xl">
                      {/* Product visibility defaults */}
                      <div className="flex flex-col gap-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          Global Product Visibility
                        </h4>
                        <p className="text-[11px] text-zinc-500">
                          Defaults for every product. Individual products can override these in the product editor.
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {Object.keys(DEFAULT_PRODUCT_VISIBILITY).map((key) => {
                            const visibility = {
                              ...DEFAULT_PRODUCT_VISIBILITY,
                              ...(websiteSettings.productVisibility || {})
                            };
                            return (
                              <label
                                key={key}
                                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 px-3 py-2 text-xs font-semibold dark:border-zinc-800"
                              >
                                <span>{VISIBILITY_LABELS[key] || key}</span>
                                <input
                                  type="checkbox"
                                  checked={visibility[key] !== false}
                                  onChange={(e) =>
                                    setWebsiteSettings({
                                      ...websiteSettings,
                                      productVisibility: {
                                        ...visibility,
                                        [key]: e.target.checked
                                      }
                                    })
                                  }
                                  className="h-4 w-4"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <hr className="border-zinc-100 dark:border-zinc-900" />

                      {/* Badge library */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Product Badge Library
                          </h4>
                          <button
                            type="button"
                            onClick={() =>
                              setWebsiteSettings({
                                ...websiteSettings,
                                badgeLibrary: [
                                  ...(websiteSettings.badgeLibrary || []),
                                  {
                                    key: `badge_${Date.now()}`,
                                    label: "New Badge",
                                    color: "#111111",
                                    icon: "",
                                    priority: 100,
                                    enabled: true
                                  }
                                ]
                              })
                            }
                            className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase dark:bg-zinc-900"
                          >
                            Add Badge
                          </button>
                        </div>
                        <div className="flex flex-col gap-2">
                          {(websiteSettings.badgeLibrary || []).map((badge, index) => (
                            <div
                              key={`${badge.key}-${index}`}
                              className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-100 p-3 sm:grid-cols-6 dark:border-zinc-800"
                            >
                              <input
                                value={badge.label || ""}
                                onChange={(e) => {
                                  const next = [...(websiteSettings.badgeLibrary || [])];
                                  next[index] = { ...badge, label: e.target.value };
                                  setWebsiteSettings({ ...websiteSettings, badgeLibrary: next });
                                }}
                                placeholder="Label"
                                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[11px] font-semibold dark:border-zinc-800 dark:bg-zinc-900"
                              />
                              <input
                                value={badge.key || ""}
                                onChange={(e) => {
                                  const next = [...(websiteSettings.badgeLibrary || [])];
                                  next[index] = { ...badge, key: e.target.value };
                                  setWebsiteSettings({ ...websiteSettings, badgeLibrary: next });
                                }}
                                placeholder="Key"
                                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[11px] font-semibold dark:border-zinc-800 dark:bg-zinc-900"
                              />
                              <input
                                type="color"
                                value={badge.color || "#111111"}
                                onChange={(e) => {
                                  const next = [...(websiteSettings.badgeLibrary || [])];
                                  next[index] = { ...badge, color: e.target.value };
                                  setWebsiteSettings({ ...websiteSettings, badgeLibrary: next });
                                }}
                                className="h-9 w-full cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-800"
                              />
                              <input
                                type="number"
                                value={badge.priority ?? 100}
                                onChange={(e) => {
                                  const next = [...(websiteSettings.badgeLibrary || [])];
                                  next[index] = { ...badge, priority: Number(e.target.value) };
                                  setWebsiteSettings({ ...websiteSettings, badgeLibrary: next });
                                }}
                                placeholder="Priority"
                                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[11px] font-semibold dark:border-zinc-800 dark:bg-zinc-900"
                              />
                              <label className="flex items-center gap-2 text-[11px] font-semibold">
                                <input
                                  type="checkbox"
                                  checked={badge.enabled !== false}
                                  onChange={(e) => {
                                    const next = [...(websiteSettings.badgeLibrary || [])];
                                    next[index] = { ...badge, enabled: e.target.checked };
                                    setWebsiteSettings({ ...websiteSettings, badgeLibrary: next });
                                  }}
                                />
                                Enabled
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (websiteSettings.badgeLibrary || []).filter((_, i) => i !== index);
                                  setWebsiteSettings({ ...websiteSettings, badgeLibrary: next });
                                }}
                                className="rounded-lg text-[10px] font-bold uppercase text-red-500"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <hr className="border-zinc-100 dark:border-zinc-900" />

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

      {/* MODAL: ORDER CHAT (ADMIN SIDE) */}
      <Modal
        isOpen={!!chatOrder}
        onClose={() => setChatOrder(null)}
        title={`Chat with Customer - Order #${chatOrder?.orderNumber}`}
      >
        <div className="flex flex-col h-[400px]">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 border border-zinc-100 rounded-xl dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col gap-3">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center my-auto font-medium">No messages yet. Send a message to start chatting with the customer.</p>
            ) : (
              chatMessages.map((msg) => {
                const customerId = chatOrder?.customer?._id || chatOrder?.customer;
                const senderId = msg.sender?._id || msg.sender;
                const isCustomer = senderId?.toString() === customerId?.toString();
                const isMe = senderId?.toString() === user?._id?.toString();
                const isAdminMessage = !isCustomer;
                return (
                  <div
                    key={msg._id}
                    className={`flex flex-col max-w-[80%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                  >
                    <span className="text-[9px] text-zinc-400 font-bold mb-1">
                      {isMe ? "You (Support)" : (isCustomer ? `${msg.sender?.name || "Customer"} (Customer)` : `${msg.sender?.name || "Support"} (${msg.sender?.role || "Support"})`)}
                    </span>
                    <div
                      className={`rounded-2xl px-4 py-2 text-xs font-semibold ${isMe ? "bg-black text-white dark:bg-white dark:text-black rounded-tr-none" : "bg-zinc-200 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 rounded-tl-none"}`}
                    >
                      {msg.message}
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-1 font-medium">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Form input */}
          <form onSubmit={handleSendChatMessage} className="flex gap-2 mt-4">
            <input
              type="text"
              placeholder="Type your reply..."
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
            <button
              type="submit"
              className="rounded-xl bg-black px-5 text-xs font-bold uppercase text-white hover:bg-zinc-800 dark:bg-white dark:text-black"
            >
              Send
            </button>
          </form>
        </div>
      </Modal>

      <Footer />
    </>
  );
};

const AdminDashboard = () => (
  <Suspense fallback={<DashboardSkeleton />}>
    <AdminDashboardInner />
  </Suspense>
);

export default AdminDashboard;
