"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import {
  IoCloseOutline,
  IoFunnelOutline,
  IoGitCompareOutline,
  IoChevronDownOutline,
} from "react-icons/io5";

import Navbar from "../../components/Navbar.js";
import Footer from "../../components/Footer.js";
import ProductCard from "../../components/ProductCard.js";
import QuickViewModal from "../../components/QuickViewModal.js";
import Modal from "../../components/Modal.js";
import { ProductCardSkeleton } from "../../components/Skeleton.js";
import api from "../../utils/api.js";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
  { value: "popular", label: "Most Popular" },
  { value: "bestselling", label: "Best Selling" },
];

const RATING_OPTIONS = [
  { value: "4", label: "4★ & up" },
  { value: "3", label: "3★ & up" },
  { value: "2", label: "2★ & up" },
];

const PAGE_LIMIT = 12;

const formatPrice = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const FilterSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-100 pb-5 dark:border-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-3 flex w-full items-center justify-between text-left"
      >
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-800 dark:text-zinc-100">
          {title}
        </h3>
        <IoChevronDownOutline
          className={`text-sm text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CatalogFiltersPanel = ({
  activeFilterCount,
  categories,
  brands,
  colorOptions,
  sizeOptions,
  activeCategoryDoc,
  selectedCategory,
  selectedSubcategory,
  selectedBrands,
  selectedColor,
  selectedSize,
  selectedRating,
  stockStatus,
  hasDiscount,
  newArrival,
  bestSeller,
  minPriceInput,
  maxPriceInput,
  setMinPriceInput,
  setMaxPriceInput,
  updateQuery,
  handleClearFilters,
  handleCategorySelect,
  handleSubcategorySelect,
  handleBrandChange,
  handleColorSelect,
  handleSizeSelect,
  applyPriceFilters,
}) => (
  <div className="flex flex-col gap-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider">Filters</p>
        {activeFilterCount > 0 && (
          <p className="mt-0.5 text-[11px] text-zinc-400">{activeFilterCount} active</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleClearFilters}
        className="btn-press text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-600"
      >
        Clear All
      </button>
    </div>

    <FilterSection title="Category">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => updateQuery({ category: "", subcategory: "" })}
          className={`rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
            !selectedCategory
              ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-white"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            type="button"
            onClick={() => handleCategorySelect(cat.name)}
            className={`rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
              selectedCategory === cat.name
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-white"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </FilterSection>

    {activeCategoryDoc?.subcategories?.length > 0 && (
      <FilterSection title="Subcategory">
        <div className="flex flex-wrap gap-1.5">
          {activeCategoryDoc.subcategories.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => handleSubcategorySelect(sub)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                selectedSubcategory === sub
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-zinc-800"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </FilterSection>
    )}

    <FilterSection title="Brands">
      <div className="flex max-h-44 flex-col gap-2 overflow-y-auto pr-1">
        {brands.map((br) => {
          const isChecked = selectedBrands.split(",").includes(br);
          return (
            <label
              key={br}
              className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleBrandChange(br)}
                className="rounded border-zinc-300 text-black focus:ring-0 dark:bg-zinc-900"
              />
              <span>{br}</span>
            </label>
          );
        })}
        {brands.length === 0 && (
          <p className="text-xs text-zinc-400">No brands available</p>
        )}
      </div>
    </FilterSection>

    <FilterSection title="Price Range">
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Min ₹"
          value={minPriceInput}
          onChange={(e) => setMinPriceInput(e.target.value)}
          onBlur={applyPriceFilters}
          onKeyDown={(e) => e.key === "Enter" && applyPriceFilters()}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-bold outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
        />
        <input
          type="number"
          placeholder="Max ₹"
          value={maxPriceInput}
          onChange={(e) => setMaxPriceInput(e.target.value)}
          onBlur={applyPriceFilters}
          onKeyDown={(e) => e.key === "Enter" && applyPriceFilters()}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-bold outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
        />
      </div>
      <button
        type="button"
        onClick={applyPriceFilters}
        className="btn-press mt-2 w-full rounded-xl border border-zinc-200 py-2 text-[11px] font-bold uppercase tracking-wider dark:border-zinc-800"
      >
        Apply Price
      </button>
    </FilterSection>

    <FilterSection title="Rating">
      <div className="flex flex-col gap-1.5">
        {RATING_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() =>
              updateQuery({ rating: selectedRating === opt.value ? "" : opt.value })
            }
            className={`rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
              selectedRating === opt.value
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-white"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </FilterSection>

    <FilterSection title="Availability">
      <div className="flex flex-wrap gap-1.5">
        {[
          { value: "in_stock", label: "In Stock" },
          { value: "out_of_stock", label: "Out of Stock" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() =>
              updateQuery({ stockStatus: stockStatus === opt.value ? "" : opt.value })
            }
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
              stockStatus === opt.value
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                : "border-zinc-200 text-zinc-500 dark:border-zinc-800"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </FilterSection>

    <FilterSection title="Discounts">
      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={hasDiscount}
          onChange={() => updateQuery({ hasDiscount: !hasDiscount })}
          className="rounded border-zinc-300 text-black focus:ring-0 dark:bg-zinc-900"
        />
        On Sale / Discounted
      </label>
    </FilterSection>

    {colorOptions.length > 0 && (
      <FilterSection title="Colors">
        <div className="flex flex-wrap gap-1.5">
          {colorOptions.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleColorSelect(c)}
              className={`rounded-full border px-3 py-1 text-[10px] font-bold transition ${
                selectedColor === c
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-zinc-200 text-zinc-500 dark:border-zinc-800"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </FilterSection>
    )}

    {sizeOptions.length > 0 && (
      <FilterSection title="Sizes">
        <div className="flex flex-wrap gap-1.5">
          {sizeOptions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSizeSelect(s)}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold transition ${
                selectedSize === s
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-zinc-200 text-zinc-500 dark:border-zinc-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterSection>
    )}

    <FilterSection title="Collections">
      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={newArrival}
            onChange={() => updateQuery({ newArrival: !newArrival })}
            className="rounded border-zinc-300 text-black focus:ring-0 dark:bg-zinc-900"
          />
          New Arrivals
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={bestSeller}
            onChange={() => updateQuery({ bestSeller: !bestSeller })}
            className="rounded border-zinc-300 text-black focus:ring-0 dark:bg-zinc-900"
          />
          Best Sellers
        </label>
      </div>
    </FilterSection>
  </div>
);

const SearchPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sentinelRef = useRef(null);
  const requestIdRef = useRef(0);
  const showProductCounts = useSelector(
    (state) => state.settings.storefront?.showProductCounts === true
  );

  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [colorOptions, setColorOptions] = useState([]);
  const [sizeOptions, setSizeOptions] = useState([]);

  const [minPriceInput, setMinPriceInput] = useState(searchParams.get("minPrice") || "");
  const [maxPriceInput, setMaxPriceInput] = useState(searchParams.get("maxPrice") || "");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [compareProducts, setCompareProducts] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const selectedCategory = searchParams.get("category") || "";
  const selectedSubcategory = searchParams.get("subcategory") || "";
  const selectedBrands = searchParams.get("brand") || "";
  const selectedColor = searchParams.get("color") || "";
  const selectedSize = searchParams.get("size") || "";
  const selectedSort = searchParams.get("sort") || "featured";
  const selectedRating = searchParams.get("rating") || "";
  const stockStatus = searchParams.get("stockStatus") || "";
  const hasDiscount = searchParams.get("hasDiscount") === "true";
  const newArrival = searchParams.get("newArrival") === "true";
  const bestSeller = searchParams.get("bestSeller") === "true";
  const currentPage = Number(searchParams.get("page") || "1") || 1;
  const searchQuery = searchParams.get("search") || "";

  const activeCategoryDoc = useMemo(
    () => categories.find((c) => c.name === selectedCategory),
    [categories, selectedCategory]
  );

  const updateQuery = useCallback(
    (patch = {}, { replace = true, resetPage = true } = {}) => {
      const query = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "" || value === false) {
          query.delete(key);
        } else {
          query.set(key, String(value));
        }
      });
      if (resetPage && patch.page === undefined) query.set("page", "1");
      if (!query.get("sort")) query.set("sort", selectedSort || "featured");
      const href = `/search?${query.toString()}`;
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router, searchParams, selectedSort]
  );

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await api.get("/products/brands-stats");
        if (res.data.success) {
          setBrands(res.data.brands || []);
          setCategories(res.data.categories || []);
          setColorOptions(res.data.colors || []);
          setSizeOptions(res.data.sizes || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMetadata();
  }, []);

  // Filter signature without page — used to reset list vs append
  const filterKey = useMemo(() => {
    const q = new URLSearchParams(searchParams.toString());
    q.delete("page");
    return q.toString();
  }, [searchParams]);

  useEffect(() => {
    const fetchProducts = async () => {
      const reqId = ++requestIdRef.current;
      const isAppend = currentPage > 1;

      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setProducts([]);
      }

      try {
        const query = new URLSearchParams(searchParams.toString());
        if (!query.has("page")) query.set("page", "1");
        if (!query.has("limit")) query.set("limit", String(PAGE_LIMIT));
        if (!query.has("sort")) query.set("sort", "featured");

        const res = await api.get(`/products?${query.toString()}`);
        if (reqId !== requestIdRef.current) return;

        if (res.data.success) {
          setTotalProducts(res.data.totalProducts);
          setTotalPages(res.data.totalPages);
          setProducts((prev) => {
            if (!isAppend) return res.data.products;
            const map = new Map(prev.map((p) => [p._id, p]));
            res.data.products.forEach((p) => map.set(p._id, p));
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (reqId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };
    fetchProducts();
  }, [filterKey, currentPage, searchParams]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries[0]?.isIntersecting;
        if (hit && !loading && !loadingMore && currentPage < totalPages) {
          updateQuery({ page: currentPage + 1 }, { resetPage: false });
        }
      },
      { rootMargin: "280px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, loadingMore, currentPage, totalPages, updateQuery]);

  const handleCategorySelect = (catName) => {
    if (selectedCategory === catName) {
      updateQuery({ category: "", subcategory: "" });
    } else {
      updateQuery({ category: catName, subcategory: "" });
    }
  };

  const handleSubcategorySelect = (sub) => {
    updateQuery({
      subcategory: selectedSubcategory === sub ? "" : sub,
      category: selectedCategory || activeCategoryDoc?.name || "",
    });
  };

  const handleBrandChange = (brandName) => {
    let brandsArr = selectedBrands ? selectedBrands.split(",").filter(Boolean) : [];
    if (brandsArr.includes(brandName)) {
      brandsArr = brandsArr.filter((b) => b !== brandName);
    } else {
      brandsArr.push(brandName);
    }
    updateQuery({ brand: brandsArr.join(",") });
  };

  const handleColorSelect = (color) => {
    updateQuery({ color: selectedColor === color ? "" : color });
  };

  const handleSizeSelect = (size) => {
    updateQuery({ size: selectedSize === size ? "" : size });
  };

  const applyPriceFilters = () => {
    updateQuery({
      minPrice: minPriceInput || "",
      maxPrice: maxPriceInput || "",
    });
  };

  const handleClearFilters = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    router.replace(searchQuery ? `/search?search=${encodeURIComponent(searchQuery)}` : "/search");
  };

  const handleCompareToggle = (product) => {
    setCompareProducts((prev) => {
      const exists = prev.some((p) => p._id === product._id);
      if (exists) return prev.filter((p) => p._id !== product._id);
      if (prev.length >= 3) {
        return [...prev.slice(1), product];
      }
      return [...prev, product];
    });
  };

  const activeFilterCount = [
    selectedCategory,
    selectedSubcategory,
    selectedBrands,
    selectedColor,
    selectedSize,
    selectedRating,
    stockStatus,
    hasDiscount,
    newArrival,
    bestSeller,
    searchParams.get("minPrice"),
    searchParams.get("maxPrice"),
  ].filter(Boolean).length;

  const filterPanelProps = {
    activeFilterCount,
    categories,
    brands,
    colorOptions,
    sizeOptions,
    activeCategoryDoc,
    selectedCategory,
    selectedSubcategory,
    selectedBrands,
    selectedColor,
    selectedSize,
    selectedRating,
    stockStatus,
    hasDiscount,
    newArrival,
    bestSeller,
    minPriceInput,
    maxPriceInput,
    setMinPriceInput,
    setMaxPriceInput,
    updateQuery,
    handleClearFilters,
    handleCategorySelect,
    handleSubcategorySelect,
    handleBrandChange,
    handleColorSelect,
    handleSizeSelect,
    applyPriceFilters,
  };

  return (
    <>
      <Navbar />
      <main className="catalog-page relative min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white text-zinc-900 transition-colors dark:from-zinc-950 dark:via-black dark:to-black dark:text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-900 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Catalog
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {searchQuery
                  ? `Results for “${searchQuery}”`
                  : selectedCategory || "All Products"}
              </h1>
              <p className="mt-1 text-xs font-medium text-zinc-400">
                {loading && products.length === 0
                  ? "Loading collection…"
                  : showProductCounts
                    ? `${totalProducts} premium piece${totalProducts === 1 ? "" : "s"}`
                    : "Curated selection"}
                {selectedSubcategory ? ` · ${selectedSubcategory}` : ""}
              </p>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(true)}
                className="btn-press flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider lg:hidden dark:border-zinc-800 dark:bg-zinc-950"
              >
                <IoFunnelOutline />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white dark:bg-white dark:text-black">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <select
                value={selectedSort}
                onChange={(e) => updateQuery({ sort: e.target.value })}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold outline-none sm:min-w-[200px] sm:flex-initial dark:border-zinc-800 dark:bg-zinc-950"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category pills */}
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => updateQuery({ category: "", subcategory: "" })}
              className={`btn-press whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide transition ${
                !selectedCategory
                  ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-black"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-400 dark:ring-zinc-800"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => handleCategorySelect(cat.name)}
                className={`btn-press whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide transition ${
                  selectedCategory === cat.name
                    ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-black"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-400 dark:ring-zinc-800"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-4">
            <aside className="catalog-filters sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 lg:block lg:col-span-1">
              <CatalogFiltersPanel {...filterPanelProps} />
            </aside>

            <section className="lg:col-span-3">
              {loading && products.length === 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-3 xl:gap-6">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-20 text-center dark:border-zinc-800 dark:bg-zinc-950/50">
                  <h3 className="text-base font-bold uppercase tracking-wider">
                    No products match
                  </h3>
                  <p className="mt-2 max-w-sm text-xs text-zinc-400">
                    Try clearing filters or exploring another category.
                  </p>
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="btn-press mt-6 rounded-full bg-zinc-900 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white dark:bg-white dark:text-black"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:gap-6">
                    {products.map((prod) => (
                      <ProductCard
                        key={prod._id}
                        product={prod}
                        onQuickView={setQuickViewProduct}
                        onCompareToggle={handleCompareToggle}
                        isCompared={compareProducts.some((p) => p._id === prod._id)}
                      />
                    ))}
                  </div>

                  <div className="mt-10 flex flex-col items-center gap-4">
                    {showProductCounts && (
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Showing {products.length} of {totalProducts}
                      </p>
                    )}

                    {currentPage < totalPages && (
                      <button
                        type="button"
                        disabled={loadingMore}
                        onClick={() =>
                          updateQuery({ page: currentPage + 1 }, { resetPage: false })
                        }
                        className="btn-press rounded-full border border-zinc-200 bg-white px-8 py-3 text-xs font-bold uppercase tracking-wider transition hover:border-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-white"
                      >
                        {loadingMore ? "Loading…" : "Load More"}
                      </button>
                    )}

                    <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {isFilterPanelOpen && (
          <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/45"
              onClick={() => setIsFilterPanelOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="filter-drawer z-10 flex h-full w-[min(22rem,92vw)] flex-col bg-white shadow-2xl dark:bg-zinc-950"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-900">
                <h3 className="text-sm font-bold uppercase tracking-wider">Filters</h3>
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  <IoCloseOutline className="text-2xl" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <CatalogFiltersPanel {...filterPanelProps} />
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 p-4 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn-press rounded-xl border border-zinc-200 py-3 text-xs font-bold uppercase dark:border-zinc-800"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyPriceFilters();
                    setIsFilterPanelOpen(false);
                  }}
                  className="btn-press rounded-xl bg-zinc-900 py-3 text-xs font-bold uppercase text-white dark:bg-white dark:text-black"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compare tray */}
      <AnimatePresence>
        {compareProducts.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
          >
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-x-auto">
                <IoGitCompareOutline className="shrink-0 text-lg" />
                <span className="shrink-0 text-xs font-bold uppercase tracking-wider">
                  Compare ({compareProducts.length}/3)
                </span>
                {compareProducts.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center gap-2 rounded-full bg-zinc-100 py-1 pl-1 pr-2 dark:bg-zinc-900"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.images?.[0]}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                    <span className="max-w-[100px] truncate text-[11px] font-semibold">
                      {p.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCompareToggle(p)}
                      className="text-zinc-400 hover:text-zinc-800"
                    >
                      <IoCloseOutline />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCompareProducts([])}
                  className="btn-press rounded-xl px-4 py-2 text-[11px] font-bold uppercase text-zinc-500"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={compareProducts.length < 2}
                  onClick={() => setCompareOpen(true)}
                  className="btn-press rounded-xl bg-zinc-900 px-5 py-2 text-[11px] font-bold uppercase text-white disabled:opacity-40 dark:bg-white dark:text-black"
                >
                  Compare Now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <QuickViewModal
        product={quickViewProduct}
        isOpen={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
      />

      <Modal
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        title="Compare Products"
        maxWidthClass="max-w-4xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr>
                <th className="pb-3 pr-3 font-bold uppercase tracking-wider text-zinc-400">Spec</th>
                {compareProducts.map((p) => (
                  <th key={p._id} className="pb-3 pr-3 align-bottom">
                    <div className="flex flex-col gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.images?.[0]}
                        alt={p.title}
                        className="h-28 w-full rounded-xl object-cover"
                      />
                      <span className="line-clamp-2 font-semibold text-zinc-900 dark:text-white">
                        {p.title}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {[
                ["Brand", (p) => p.brand],
                [
                  "Category",
                  (p) =>
                    typeof p.category === "object" ? p.category?.name : p.category || "—",
                ],
                ["Price", (p) => formatPrice(p.salePrice)],
                ["MRP", (p) => formatPrice(p.mrp)],
                ["Discount", (p) => (p.discount ? `${p.discount}%` : "—")],
                ["Rating", (p) => `${Number(p.rating || 0).toFixed(1)} (${p.reviewCount || 0})`],
                ["Sold", (p) => p.soldCount || 0],
                ["Stock", (p) => (p.stock > 0 ? `${p.stock} available` : "Out of stock")],
                ["Colors", (p) => (p.colors?.length ? p.colors.join(", ") : "—")],
                ["Sizes", (p) => (p.sizes?.length ? p.sizes.join(", ") : "—")],
              ].map(([label, getter]) => (
                <tr key={label}>
                  <td className="py-3 pr-3 font-bold uppercase tracking-wider text-zinc-400">
                    {label}
                  </td>
                  {compareProducts.map((p) => (
                    <td key={`${p._id}-${label}`} className="py-3 pr-3 font-medium text-zinc-700 dark:text-zinc-300">
                      {getter(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      <Footer />
    </>
  );
};

export default SearchPage;
