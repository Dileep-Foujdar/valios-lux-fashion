"use client";

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  IoAddOutline,
  IoTrashOutline,
  IoArrowUpOutline,
  IoArrowDownOutline,
} from "react-icons/io5";
import api from "../../utils/api.js";
import ImageUploader from "./ImageUploader.js";

const TABS = [
  { id: "categories", label: "Categories" },
  { id: "brand", label: "Brands" },
  { id: "color", label: "Colors" },
  { id: "size", label: "Sizes" },
  { id: "material", label: "Materials" },
  { id: "tag", label: "Tags" },
  { id: "variant", label: "Variants" },
];

const CatalogManager = () => {
  const [tab, setTab] = useState("categories");
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", code: "", image: "" });
  const [editingCategory, setEditingCategory] = useState(null);
  const [subInput, setSubInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "categories") {
        const res = await api.get("/catalog/categories?includeDisabled=true");
        if (res.data.success) setCategories(res.data.categories || []);
      } else {
        const res = await api.get(`/catalog/items?type=${tab}&includeDisabled=true`);
        if (res.data.success) setItems(res.data.items || []);
      }
    } catch (err) {
      toast.error("Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setForm({ name: "", code: "", image: "" });
      setEditingCategory(null);
      void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const createItem = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    try {
      await api.post("/catalog/items", {
        type: tab,
        name: form.name,
        code: form.code,
      });
      toast.success("Created");
      setForm({ name: "", code: "", image: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Create failed");
    }
  };

  const toggleItem = async (item) => {
    try {
      await api.put(`/catalog/items/${item._id}`, { enabled: !item.enabled });
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this item?")) return;
    try {
      await api.delete(`/catalog/items/${id}`);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const moveItem = async (index, dir) => {
    const next = [...items];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setItems(next);
    try {
      await api.put("/catalog/items/reorder", {
        type: tab,
        orderedIds: next.map((i) => i._id),
      });
    } catch {
      toast.error("Reorder failed");
      load();
    }
  };

  const saveCategory = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    if (!form.image?.trim()) return toast.error("Upload a category image");
    try {
      if (editingCategory) {
        await api.put(`/catalog/categories/${editingCategory._id}`, {
          name: form.name,
          image: form.image,
          subcategories: editingCategory.subcategories || [],
        });
        toast.success("Category updated");
      } else {
        await api.post("/catalog/categories", {
          name: form.name,
          image: form.image,
          subcategories: [],
        });
        toast.success("Category created");
      }
      setForm({ name: "", code: "", image: "" });
      setEditingCategory(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    }
  };

  const toggleCategory = async (cat) => {
    try {
      await api.put(`/catalog/categories/${cat._id}`, { enabled: !cat.enabled });
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const deleteCategory = async (id) => {
    if (!confirm("Delete this category?")) return;
    try {
      await api.delete(`/catalog/categories/${id}`);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const normalizeSubs = (list = []) =>
    (list || [])
      .map((item, index) => {
        if (typeof item === "string") {
          return { name: item.trim(), enabled: true, order: index };
        }
        return {
          name: String(item?.name || "").trim(),
          enabled: item?.enabled !== false,
          order: Number(item?.order) || index,
        };
      })
      .filter((s) => s.name);

  const addSubcategory = async (cat) => {
    const name = subInput.trim();
    if (!name) return;
    const existing = normalizeSubs(cat.subcategories);
    if (existing.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("Subcategory already exists");
    }
    const subs = [...existing, { name, enabled: true, order: existing.length }];
    try {
      await api.put(`/catalog/categories/${cat._id}`, { subcategories: subs });
      setSubInput("");
      setEditingCategory(null);
      toast.success("Subcategory added");
      load();
    } catch {
      toast.error("Failed to add subcategory");
    }
  };

  const toggleSub = async (cat, subName) => {
    const subs = normalizeSubs(cat.subcategories).map((s) =>
      s.name === subName ? { ...s, enabled: !s.enabled } : s
    );
    try {
      await api.put(`/catalog/categories/${cat._id}`, { subcategories: subs });
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const moveCategory = async (index, dir) => {
    const next = [...categories];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setCategories(next);
    try {
      await api.put("/catalog/categories/reorder", {
        orderedIds: next.map((c) => c._id),
      });
    } catch {
      toast.error("Reorder failed");
      load();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold uppercase tracking-wider">Catalog Management</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Manage categories, brands, colors, sizes, materials, tags, and variants used across the storefront.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
              tab === t.id
                ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "categories" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-900">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider">
              {editingCategory ? "Edit Category" : "Add Category"}
            </h3>
            <div className="flex flex-col gap-3">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Category name"
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold outline-none dark:border-zinc-800 dark:bg-zinc-900"
              />
              <ImageUploader
                label="Category Image"
                folder="categories"
                minImages={1}
                maxImages={1}
                value={form.image ? [form.image] : []}
                onChange={(urls) =>
                  setForm((f) => ({ ...f, image: urls[0] || "" }))
                }
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveCategory}
                  className="btn-press flex items-center gap-1 rounded-xl bg-zinc-900 px-4 py-2 text-[11px] font-bold uppercase text-white dark:bg-white dark:text-black"
                >
                  <IoAddOutline /> {editingCategory ? "Update" : "Create"}
                </button>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setForm({ name: "", code: "", image: "" });
                    }}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-[11px] font-bold uppercase dark:border-zinc-800"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-900">
            {loading ? (
              <p className="text-xs text-zinc-400">Loading…</p>
            ) : (
              <div className="flex flex-col gap-3">
                {categories.map((cat, index) => (
                  <div
                    key={cat._id}
                    className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{cat.name}</p>
                        <p className="text-[10px] text-zinc-400">
                          {cat.enabled === false ? "Disabled" : "Enabled"} · {cat.slug}
                        </p>
                        {cat.enabled === false && (
                          <p className="mt-1 text-[10px] font-semibold text-amber-600">
                            Disabled — storefront hides it. Click Enable to use on site.
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => moveCategory(index, -1)} className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900">
                          <IoArrowUpOutline />
                        </button>
                        <button type="button" onClick={() => moveCategory(index, 1)} className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900">
                          <IoArrowDownOutline />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setForm({ name: cat.name, image: cat.image, code: "" });
                          }}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        >
                          {cat.enabled === false ? "Enable" : "Disable"}
                        </button>
                        <button type="button" onClick={() => deleteCategory(cat._id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                          <IoTrashOutline />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {normalizeSubs(cat.subcategories).map((sub) => (
                        <button
                          key={sub.name}
                          type="button"
                          onClick={() => toggleSub(cat, sub.name)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            sub.enabled === false
                              ? "bg-zinc-100 text-zinc-400 line-through dark:bg-zinc-900"
                              : "bg-zinc-900 text-white dark:bg-white dark:text-black"
                          }`}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={editingCategory?._id === cat._id ? subInput : ""}
                        onChange={(e) => {
                          setEditingCategory(cat);
                          setSubInput(e.target.value);
                        }}
                        placeholder="Add subcategory"
                        className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] dark:border-zinc-800 dark:bg-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => addSubcategory(cat)}
                        className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase dark:bg-zinc-900"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-900">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider">Add {tab}</h3>
            <div className="flex flex-col gap-3">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name"
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold outline-none dark:border-zinc-800 dark:bg-zinc-900"
              />
              {tab === "color" && (
                <input
                  type="color"
                  value={form.code || "#111111"}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  className="h-10 w-full cursor-pointer rounded-xl border border-zinc-200 dark:border-zinc-800"
                />
              )}
              <button
                type="button"
                onClick={createItem}
                className="btn-press flex items-center justify-center gap-1 rounded-xl bg-zinc-900 px-4 py-2 text-[11px] font-bold uppercase text-white dark:bg-white dark:text-black"
              >
                <IoAddOutline /> Create
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-900">
            {loading ? (
              <p className="text-xs text-zinc-400">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-zinc-400">No items yet. Create your first {tab}.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((item, index) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      {tab === "color" && (
                        <span
                          className="h-4 w-4 rounded-full border border-zinc-200"
                          style={{ background: item.code || "#ccc" }}
                        />
                      )}
                      <div>
                        <p className="text-xs font-semibold">{item.name}</p>
                        <p className="text-[10px] text-zinc-400">
                          {item.enabled ? "Enabled" : "Disabled"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveItem(index, -1)} className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900">
                        <IoArrowUpOutline />
                      </button>
                      <button type="button" onClick={() => moveItem(index, 1)} className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900">
                        <IoArrowDownOutline />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleItem(item)}
                        className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      >
                        {item.enabled ? "Disable" : "Enable"}
                      </button>
                      <button type="button" onClick={() => deleteItem(item._id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                        <IoTrashOutline />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogManager;
