"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { IoAddOutline, IoTrashOutline, IoArrowBackOutline } from "react-icons/io5";
import Link from "next/link";

import api from "../../utils/api.js";
import ImageUploader from "./ImageUploader.js";
import {
  DEFAULT_PRODUCT_VISIBILITY,
  VISIBILITY_LABELS
} from "../../utils/productDisplay.js";

const slugify = (text = "") =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const SECTIONS = [
  { id: "basic", label: "Basic" },
  { id: "pricing", label: "Pricing" },
  { id: "inventory", label: "Inventory" },
  { id: "media", label: "Media" },
  { id: "colors", label: "Colors" },
  { id: "display", label: "Display" },
  { id: "badges", label: "Badges" },
  { id: "seo", label: "SEO" },
  { id: "publish", label: "Publishing" }
];

const emptyVariant = () => ({
  name: "",
  code: "#111111",
  images: []
});

const ProductForm = ({ mode = "create", productId = null }) => {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("basic");
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [colorVariants, setColorVariants] = useState([]);
  const [keywords, setKeywords] = useState("");
  const [sizesText, setSizesText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [slugManual, setSlugManual] = useState(false);
  const [brandOptions, setBrandOptions] = useState([]);
  const [sizeOptions, setSizeOptions] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  const [badgeLibrary, setBadgeLibrary] = useState([]);
  const [productBadges, setProductBadges] = useState([]);
  const [displayConfig, setDisplayConfig] = useState({});

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors }
  } = useForm({
    defaultValues: {
      title: "",
      slug: "",
      sku: "",
      brand: "",
      category: "",
      subcategory: "",
      shortDescription: "",
      description: "",
      mrp: "",
      salePrice: "",
      taxPercent: 0,
      shippingCost: 0,
      stock: 0,
      lowStockThreshold: 15,
      status: "published",
      featured: false,
      trending: false,
      bestSeller: false,
      newArrival: false,
      offerProduct: false,
      metaTitle: "",
      metaDescription: ""
    }
  });

  const title = useWatch({ control, name: "title", defaultValue: "" });
  const categoryId = useWatch({ control, name: "category", defaultValue: "" });
  const mrp = Number(useWatch({ control, name: "mrp", defaultValue: "" })) || 0;
  const salePrice = Number(useWatch({ control, name: "salePrice", defaultValue: "" })) || 0;
  const stock = Number(useWatch({ control, name: "stock", defaultValue: 0 })) || 0;
  const lowStockThreshold =
    Number(useWatch({ control, name: "lowStockThreshold", defaultValue: 15 })) || 15;

  const selectedCategory = useMemo(
    () => categories.find((c) => c._id === categoryId),
    [categories, categoryId]
  );

  const discount = mrp > 0 ? Math.max(0, Math.round(((mrp - salePrice) / mrp) * 100)) : 0;
  const stockStatus =
    stock <= 0 ? "Out of Stock" : stock <= lowStockThreshold ? "Low Stock" : "In Stock";

  useEffect(() => {
    Promise.all([
      api.get("/products/categories"),
      api.get("/products/brands-stats"),
      api.get("/admin/settings")
    ]).then(([catRes, brandRes, settingsRes]) => {
      if (catRes.data.success) setCategories(catRes.data.categories || []);
      if (brandRes.data.success) {
        setBrandOptions(brandRes.data.brands || []);
        setSizeOptions(brandRes.data.sizes || []);
        setTagOptions(brandRes.data.tags || []);
      }
      if (settingsRes.data.success) {
        setBadgeLibrary(settingsRes.data.settings?.badgeLibrary || []);
      }
    });
  }, []);

  useEffect(() => {
    if (!slugManual && title) {
      setValue("slug", slugify(title));
    }
  }, [title, slugManual, setValue]);

  useEffect(() => {
    if (mode !== "edit" || !productId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [prodRes, analyticsRes] = await Promise.all([
          api.get(`/products/${productId}`),
          api.get(`/products/${productId}/analytics`).catch(() => null)
        ]);

        if (!prodRes.data.success) throw new Error("Failed to load product");
        const p = prodRes.data.product;

        reset({
          title: p.title || "",
          slug: p.slug || "",
          sku: p.sku || "",
          brand: p.brand || "",
          category: p.category?._id || p.category || "",
          subcategory: p.subcategory || "",
          shortDescription: p.shortDescription || "",
          description: p.description || "",
          mrp: p.mrp ?? "",
          salePrice: p.salePrice ?? "",
          taxPercent: p.taxPercent ?? 0,
          shippingCost: p.shippingCost ?? 0,
          stock: p.stock ?? 0,
          lowStockThreshold: p.lowStockThreshold ?? 15,
          status: p.status || "published",
          featured: Boolean(p.featured),
          trending: Boolean(p.trending),
          bestSeller: Boolean(p.bestSeller),
          newArrival: Boolean(p.newArrival || p.latest),
          offerProduct: Boolean(p.offerProduct),
          metaTitle: p.seo?.metaTitle || "",
          metaDescription: p.seo?.metaDescription || ""
        });

        setSlugManual(Boolean(p.slug));
        setImages(p.images || []);
        setColorVariants(
          Array.isArray(p.colorVariants) && p.colorVariants.length
            ? p.colorVariants.map((v) => ({
                name: v.name || "",
                code: v.code || "#111111",
                images: v.images || []
              }))
            : []
        );
        setKeywords((p.seo?.keywords || []).join(", "));
        setSizesText((p.sizes || []).join(", "));
        setTagsText((p.tags || []).join(", "));
        setProductBadges(Array.isArray(p.badges) ? p.badges : []);
        setDisplayConfig(p.displayConfig || {});
        if (analyticsRes?.data?.success) setAnalytics(analyticsRes.data.analytics);
      } catch (err) {
        toast.error(err.response?.data?.message || "Could not load product");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mode, productId, reset]);

  const updateVariant = (index, patch) => {
    setColorVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const onSubmit = async (data) => {
    if (colorVariants.length > 0) {
      for (const v of colorVariants) {
        if (!v.name.trim()) {
          toast.error("Each color needs a name");
          setActiveSection("colors");
          return;
        }
        if ((v.images || []).length < 3) {
          toast.error(`Color "${v.name}" needs at least 3 images`);
          setActiveSection("colors");
          return;
        }
      }
    } else if (images.length < 3) {
      toast.error("Upload at least 3 product images");
      setActiveSection("media");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: data.title.trim(),
        slug: data.slug.trim() || slugify(data.title),
        sku: data.sku.trim(),
        brand: data.brand.trim(),
        category: data.category,
        subcategory: data.subcategory,
        shortDescription: data.shortDescription,
        description: data.description,
        mrp: Number(data.mrp),
        salePrice: Number(data.salePrice),
        taxPercent: Number(data.taxPercent) || 0,
        shippingCost: Number(data.shippingCost) || 0,
        stock: Number(data.stock) || 0,
        lowStockThreshold: Number(data.lowStockThreshold) || 15,
        status: data.status,
        featured: Boolean(data.featured),
        trending: Boolean(data.trending),
        bestSeller: Boolean(data.bestSeller),
        newArrival: Boolean(data.newArrival),
        latest: Boolean(data.newArrival),
        offerProduct: Boolean(data.offerProduct),
        badges: productBadges,
        displayConfig,
        sizes: sizesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        tags: tagsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        images,
        colorVariants: colorVariants.map((v) => ({
          name: v.name.trim(),
          code: v.code,
          images: v.images
        })),
        seo: {
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        }
      };

      const res =
        mode === "edit"
          ? await api.put(`/products/${productId}`, payload)
          : await api.post("/products", payload);

      if (res.data.success) {
        toast.success(mode === "edit" ? "Product updated" : "Product created");
        router.push("/admin?tab=inventory");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-xs font-bold uppercase tracking-wider text-zinc-400">
        Loading product...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin?tab=inventory"
            className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-black dark:hover:text-white"
          >
            <IoArrowBackOutline /> Back to Inventory
          </Link>
          <h1 className="text-xl font-black uppercase tracking-wider">
            {mode === "edit" ? "Edit Product" : "Add Product"}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={saving}
          className="rounded-full bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {saving ? "Saving..." : mode === "edit" ? "Update Product" : "Create Product"}
        </button>
      </div>

      {analytics && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          {[
            ["Sold", analytics.soldCount],
            ["Revenue", `₹${analytics.revenue}`],
            ["Views", analytics.viewCount],
            ["Orders", analytics.orderCount],
            ["Wishlist", analytics.wishlistCount],
            ["Cart", analytics.cartCount],
            ["Returns", analytics.returnCount],
            ["Conv.", `${analytics.conversionRate}%`]
          ].map(([label, val]) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-100 bg-white p-3 dark:border-zinc-900 dark:bg-zinc-950/40"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
              <p className="mt-1 text-sm font-black">{val}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider ${
              activeSection === s.id
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {activeSection === "basic" && (
          <section className="rounded-3xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider">Basic Information</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Product Name" error={errors.title?.message}>
                <input
                  {...register("title", { required: "Required" })}
                  className={inputCls}
                  placeholder="Premium Silk Shirt"
                />
              </Field>
              <Field label="Slug">
                <input
                  {...register("slug")}
                  onChange={(e) => {
                    setSlugManual(true);
                    setValue("slug", slugify(e.target.value));
                  }}
                  className={inputCls}
                />
              </Field>
              <Field label="SKU" error={errors.sku?.message}>
                <input {...register("sku", { required: "Required" })} className={inputCls} />
              </Field>
              <Field label="Brand" error={errors.brand?.message}>
                <input
                  list="brand-options"
                  {...register("brand", { required: "Required" })}
                  className={inputCls}
                />
                <datalist id="brand-options">
                  {brandOptions.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </Field>
              <Field label="Category" error={errors.category?.message}>
                <select {...register("category", { required: "Required" })} className={inputCls}>
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sub Category" error={errors.subcategory?.message}>
                <select {...register("subcategory", { required: "Required" })} className={inputCls}>
                  <option value="">Select subcategory</option>
                  {(selectedCategory?.subcategories || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sizes (comma separated)" className="md:col-span-2">
                <input
                  list="size-options"
                  value={sizesText}
                  onChange={(e) => setSizesText(e.target.value)}
                  className={inputCls}
                  placeholder={sizeOptions.length ? sizeOptions.join(", ") : "S, M, L, XL"}
                />
                <datalist id="size-options">
                  {sizeOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
              <Field label="Tags (comma separated)" className="md:col-span-2">
                <input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  className={inputCls}
                  placeholder="summer, linen, casual"
                />
              </Field>
              <Field label="Short Description" className="md:col-span-2">
                <textarea {...register("shortDescription")} rows={2} className={inputCls} />
              </Field>
              <Field label="Full Description" error={errors.description?.message} className="md:col-span-2">
                <textarea
                  {...register("description", { required: "Required" })}
                  rows={5}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>
        )}

        {activeSection === "pricing" && (
          <section className="rounded-3xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider">Pricing</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Regular Price (MRP)" error={errors.mrp?.message}>
                <input type="number" step="0.01" {...register("mrp", { required: "Required" })} className={inputCls} />
              </Field>
              <Field label="Sale Price" error={errors.salePrice?.message}>
                <input
                  type="number"
                  step="0.01"
                  {...register("salePrice", { required: "Required" })}
                  className={inputCls}
                />
              </Field>
              <Field label="Discount % (auto)">
                <input value={discount} readOnly className={inputCls} />
              </Field>
              <Field label="Tax %">
                <input type="number" step="0.01" {...register("taxPercent")} className={inputCls} />
              </Field>
              <Field label="Shipping Cost">
                <input type="number" step="0.01" {...register("shippingCost")} className={inputCls} />
              </Field>
            </div>
          </section>
        )}

        {activeSection === "inventory" && (
          <section className="rounded-3xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider">Inventory</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Stock Quantity" error={errors.stock?.message}>
                <input type="number" {...register("stock", { required: "Required" })} className={inputCls} />
              </Field>
              <Field label="Low Stock Alert">
                <input type="number" {...register("lowStockThreshold")} className={inputCls} />
              </Field>
              <Field label="Stock Status">
                <input value={stockStatus} readOnly className={inputCls} />
              </Field>
            </div>
          </section>
        )}

        {activeSection === "media" && (
          <section className="rounded-3xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40">
            <ImageUploader
              label="Default Product Gallery"
              value={images}
              onChange={setImages}
              minImages={colorVariants.length > 0 ? 0 : 3}
              folder="products"
            />
            {colorVariants.length > 0 && (
              <p className="mt-3 text-[11px] font-medium text-zinc-500">
                Color variants are enabled — each color gallery is required (min 3). Default gallery is optional fallback.
              </p>
            )}
          </section>
        )}

        {activeSection === "colors" && (
          <section className="rounded-3xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider">Color Variants</h2>
              <button
                type="button"
                onClick={() => setColorVariants((prev) => [...prev, emptyVariant()])}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-[10px] font-bold uppercase text-white dark:bg-white dark:text-black"
              >
                <IoAddOutline /> Add Color
              </button>
            </div>

            {colorVariants.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No color variants. Customers will see the default gallery. Add colors for per-color image sets.
              </p>
            ) : (
              <div className="space-y-6">
                {colorVariants.map((variant, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-900"
                  >
                    <div className="mb-4 flex flex-wrap items-end gap-3">
                      <div className="min-w-[160px] flex-1">
                        <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">
                          Color Name
                        </label>
                        <input
                          value={variant.name}
                          onChange={(e) => updateVariant(index, { name: e.target.value })}
                          className={inputCls}
                          placeholder="Black"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">
                          Color Code
                        </label>
                        <input
                          type="color"
                          value={variant.code || "#111111"}
                          onChange={(e) => updateVariant(index, { code: e.target.value })}
                          className="h-11 w-16 cursor-pointer rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setColorVariants((prev) => prev.filter((_, i) => i !== index))}
                        className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-2 text-[10px] font-bold uppercase text-red-600 dark:bg-red-950/30"
                      >
                        <IoTrashOutline /> Delete
                      </button>
                    </div>
                    <ImageUploader
                      label={`${variant.name || "Color"} Images`}
                      value={variant.images}
                      onChange={(imgs) => updateVariant(index, { images: imgs })}
                      minImages={3}
                      folder="products/colors"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeSection === "display" && (
          <section className="rounded-3xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider">Per-Product Display</h2>
            <p className="mb-4 text-[11px] text-zinc-500">
              Leave unchecked to inherit the global Shop Configuration defaults. Check to force show or use “Force hide”.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.keys(DEFAULT_PRODUCT_VISIBILITY).map((key) => {
                const value = displayConfig[key];
                const mode =
                  value === true ? "show" : value === false ? "hide" : "inherit";
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                  >
                    <span className="text-xs font-semibold">{VISIBILITY_LABELS[key] || key}</span>
                    <select
                      value={mode}
                      onChange={(e) => {
                        const next = { ...displayConfig };
                        if (e.target.value === "inherit") delete next[key];
                        else next[key] = e.target.value === "show";
                        setDisplayConfig(next);
                      }}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-semibold dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <option value="inherit">Inherit</option>
                      <option value="show">Force show</option>
                      <option value="hide">Force hide</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeSection === "badges" && (
          <section className="rounded-3xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider">Product Badges</h2>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Assign badges from the library. Set dates and priority per product.
                </p>
              </div>
              <select
                defaultValue=""
                onChange={(e) => {
                  const key = e.target.value;
                  if (!key) return;
                  const lib = badgeLibrary.find((b) => b.key === key);
                  if (!lib) return;
                  if (productBadges.some((b) => b.key === key)) {
                    e.target.value = "";
                    return;
                  }
                  setProductBadges((prev) => [
                    ...prev,
                    {
                      key: lib.key,
                      label: lib.label,
                      color: lib.color,
                      icon: lib.icon || "",
                      priority: lib.priority ?? 100,
                      startDate: null,
                      endDate: null,
                      enabled: true
                    }
                  ]);
                  e.target.value = "";
                }}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-semibold dark:border-zinc-800 dark:bg-zinc-900"
              >
                <option value="">Add badge…</option>
                {badgeLibrary
                  .filter((b) => b.enabled !== false)
                  .map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.label}
                    </option>
                  ))}
              </select>
            </div>

            {productBadges.length === 0 ? (
              <p className="text-xs text-zinc-400">No badges assigned yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {productBadges.map((badge, index) => (
                  <div
                    key={`${badge.key}-${index}`}
                    className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-100 p-3 md:grid-cols-6 dark:border-zinc-800"
                  >
                    <div className="col-span-2 flex items-center gap-2 md:col-span-1">
                      <span
                        className="rounded-full px-2 py-1 text-[10px] font-bold text-white"
                        style={{ background: badge.color || "#111" }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <input
                      type="color"
                      value={badge.color || "#111111"}
                      onChange={(e) => {
                        const next = [...productBadges];
                        next[index] = { ...badge, color: e.target.value };
                        setProductBadges(next);
                      }}
                      className="h-9 w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
                    />
                    <input
                      type="number"
                      value={badge.priority ?? 100}
                      onChange={(e) => {
                        const next = [...productBadges];
                        next[index] = { ...badge, priority: Number(e.target.value) };
                        setProductBadges(next);
                      }}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[11px] font-semibold dark:border-zinc-800 dark:bg-zinc-900"
                      placeholder="Priority"
                    />
                    <input
                      type="date"
                      value={badge.startDate ? String(badge.startDate).slice(0, 10) : ""}
                      onChange={(e) => {
                        const next = [...productBadges];
                        next[index] = { ...badge, startDate: e.target.value || null };
                        setProductBadges(next);
                      }}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[11px] dark:border-zinc-800 dark:bg-zinc-900"
                    />
                    <input
                      type="date"
                      value={badge.endDate ? String(badge.endDate).slice(0, 10) : ""}
                      onChange={(e) => {
                        const next = [...productBadges];
                        next[index] = { ...badge, endDate: e.target.value || null };
                        setProductBadges(next);
                      }}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[11px] dark:border-zinc-800 dark:bg-zinc-900"
                    />
                    <div className="col-span-2 flex items-center justify-between gap-2 md:col-span-6">
                      <label className="flex items-center gap-2 text-[11px] font-semibold">
                        <input
                          type="checkbox"
                          checked={badge.enabled !== false}
                          onChange={(e) => {
                            const next = [...productBadges];
                            next[index] = { ...badge, enabled: e.target.checked };
                            setProductBadges(next);
                          }}
                        />
                        Enabled
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setProductBadges((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="text-[10px] font-bold uppercase text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeSection === "seo" && (
          <section className="rounded-3xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider">SEO</h2>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Meta Title">
                <input {...register("metaTitle")} className={inputCls} />
              </Field>
              <Field label="Meta Description">
                <textarea {...register("metaDescription")} rows={3} className={inputCls} />
              </Field>
              <Field label="Keywords (comma separated)">
                <input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>
        )}

        {activeSection === "publish" && (
          <section className="rounded-3xl border border-zinc-100 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950/40">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider">Publishing</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Status">
                <select {...register("status")} className={inputCls}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </Field>
              <div className="flex flex-col gap-2 md:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Legacy flags (synced from badges when badges are assigned)
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    ["featured", "Featured"],
                    ["trending", "Trending"],
                    ["bestSeller", "Best Seller"],
                    ["newArrival", "New Arrival"],
                    ["offerProduct", "Offer / Sale"]
                  ].map(([name, label]) => (
                    <label key={name} className="flex items-center gap-2 text-xs font-semibold">
                      <input type="checkbox" {...register(name)} className="h-4 w-4" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </form>
    </div>
  );
};

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-white";

const Field = ({ label, error, children, className = "" }) => (
  <div className={className}>
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-[10px] font-medium text-red-500">{error}</p>}
  </div>
);

export default ProductForm;
