"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  IoAddOutline,
  IoSearchOutline,
  IoTrashOutline,
  IoCloudDownloadOutline,
  IoCreateOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline
} from "react-icons/io5";
import toast from "react-hot-toast";
import api from "../../utils/api.js";

const ProductInventory = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    brand: "",
    stockStatus: "",
    status: "",
    sort: "newest"
  });

  const loadMeta = async () => {
    try {
      const [catRes, brandRes, statsRes] = await Promise.all([
        api.get("/products/categories"),
        api.get("/products/brands-stats"),
        api.get("/products/inventory-stats")
      ]);
      if (catRes.data.success) setCategories(catRes.data.categories || []);
      if (brandRes.data.success) setBrands(brandRes.data.brands || []);
      if (statsRes.data.success) setStats(statsRes.data.stats);
    } catch {
      // ignore meta errors
    }
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
        sort: filters.sort || "newest",
        includeDrafts: "true"
      });
      Object.entries(filters).forEach(([k, v]) => {
        if (k !== "sort" && v) params.set(k, v);
      });

      const res = await api.get(`/products?${params.toString()}`);
      if (res.data.success) {
        setProducts(res.data.products || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalProducts(res.data.totalProducts || 0);
        setSelected([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadMeta();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadProducts();
    });
    return () => {
      cancelled = true;
    };
  }, [loadProducts]);

  const toggleAll = () => {
    if (selected.length === products.length) setSelected([]);
    else setSelected(products.map((p) => p._id));
  };

  const toggleOne = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const runBulk = async (action) => {
    if (!selected.length) {
      toast.error("Select products first");
      return;
    }
    if (action === "delete" && !window.confirm(`Delete ${selected.length} products?`)) return;

    try {
      const res = await api.post("/products/bulk", { action, ids: selected });
      toast.success(res.data.message || "Done");
      loadMeta();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk action failed");
    }
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams({ includeDrafts: "true" });
      Object.entries(filters).forEach(([k, v]) => {
        if (v && k !== "sort") params.set(k, v);
      });
      const res = await api.get(`/products/export?${params.toString()}`, {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "products-export.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  const deleteOne = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Deleted");
      loadMeta();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider">Product Inventory</h2>
          <p className="text-xs text-zinc-500">{totalProducts} products in catalog</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-2 text-[10px] font-bold uppercase dark:border-zinc-800"
          >
            <IoCloudDownloadOutline /> Export
          </button>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1 rounded-full bg-black px-4 py-2 text-[10px] font-bold uppercase text-white dark:bg-white dark:text-black"
          >
            <IoAddOutline /> Add Product
          </Link>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {[
            ["Total", stats.total],
            ["Published", stats.published],
            ["Draft", stats.draft],
            ["In Stock", stats.inStock],
            ["Low Stock", stats.lowStock],
            ["Out of Stock", stats.outOfStock]
          ].map(([label, val]) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-zinc-100 bg-white p-4 dark:border-zinc-900 dark:bg-zinc-950/40"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
              <p className="mt-1 text-xl font-black">{val}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-zinc-100 bg-white p-4 dark:border-zinc-900 dark:bg-zinc-950/40 md:grid-cols-6">
        <div className="relative md:col-span-2">
          <IoSearchOutline className="absolute left-3 top-3 text-zinc-400" />
          <input
            value={filters.search}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, search: e.target.value }));
            }}
            placeholder="Search name, SKU, brand..."
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-3 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, category: e.target.value }));
          }}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={filters.brand}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, brand: e.target.value }));
          }}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={filters.stockStatus}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, stockStatus: e.target.value }));
          }}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="">All Stock</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, status: e.target.value }));
          }}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <span className="text-[11px] font-bold uppercase tracking-wider">
            {selected.length} selected
          </span>
          <button
            onClick={() => runBulk("publish")}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[10px] font-bold uppercase text-white"
          >
            <IoCheckmarkCircleOutline /> Publish
          </button>
          <button
            onClick={() => runBulk("unpublish")}
            className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-3 py-1.5 text-[10px] font-bold uppercase text-white"
          >
            <IoCloseCircleOutline /> Unpublish
          </button>
          <button
            onClick={() => runBulk("delete")}
            className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-bold uppercase text-white"
          >
            <IoTrashOutline /> Delete
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl border border-zinc-100 bg-white dark:border-zinc-900 dark:bg-zinc-950/40">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-900 dark:bg-zinc-900/50">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={products.length > 0 && selected.length === products.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Brand</th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3">Disc</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">Rating</th>
              <th className="px-3 py-3">Reviews</th>
              <th className="px-3 py-3">Sold</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="px-4 py-10 text-center text-zinc-400">
                  Loading inventory...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-10 text-center text-zinc-400">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p._id}
                  className="border-b border-zinc-50 font-semibold dark:border-zinc-900/60"
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(p._id)}
                      onChange={() => toggleOne(p._id)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.images?.[0] || "/logo.png"}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <span className="max-w-[140px] truncate">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">{p.sku}</td>
                  <td className="px-3 py-3">{p.category?.name || "-"}</td>
                  <td className="px-3 py-3">{p.brand}</td>
                  <td className="px-3 py-3">₹{p.salePrice}</td>
                  <td className="px-3 py-3">{p.discount || 0}%</td>
                  <td className="px-3 py-3">{p.stock}</td>
                  <td className="px-3 py-3">{p.rating || 0}</td>
                  <td className="px-3 py-3">{p.reviewCount || 0}</td>
                  <td className="px-3 py-3">{p.soldCount || 0}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        p.status === "draft"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {p.status || "published"}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/products/${p._id}/edit`}
                        className="rounded-full bg-zinc-100 p-1.5 dark:bg-zinc-900"
                      >
                        <IoCreateOutline />
                      </Link>
                      <button
                        onClick={() => deleteOne(p._id)}
                        className="rounded-full bg-red-50 p-1.5 text-red-600 dark:bg-red-950/30"
                      >
                        <IoTrashOutline />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-zinc-500">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-[10px] font-bold uppercase disabled:opacity-40 dark:border-zinc-800"
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-[10px] font-bold uppercase disabled:opacity-40 dark:border-zinc-800"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductInventory;
