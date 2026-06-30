"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { IoFunnelOutline, IoCloseOutline } from "react-icons/io5";

import Navbar from "../../components/Navbar.js";
import Footer from "../../components/Footer.js";
import ProductCard from "../../components/ProductCard.js";
import { ProductCardSkeleton } from "../../components/Skeleton.js";
import api from "../../utils/api.js";

const SearchPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState(searchParams.get("subcategory") || "");
  const [selectedBrands, setSelectedBrands] = useState(searchParams.get("brand") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [selectedColor, setSelectedColor] = useState(searchParams.get("color") || "");
  const [selectedSize, setSelectedSize] = useState(searchParams.get("size") || "");
  const [selectedSort, setSelectedSort] = useState(searchParams.get("sort") || "newest");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Colors & Sizes options
  const colorOptions = ["Black", "White", "Navy Blue", "Red", "Olive Green", "Beige", "Charcoal Grey", "Silver", "Gold"];
  const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL", "UK 7", "UK 8", "UK 9", "UK 10"];

  // Fetch unique brands and categories for filter sidebar
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await api.get("/products/brands-stats");
        if (res.data.success) {
          setBrands(res.data.brands);
          setCategories(res.data.categories);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch matching products when search params change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams(searchParams.toString());
        if (!query.has("page")) query.set("page", currentPage.toString());
        if (!query.has("limit")) query.set("limit", "8");

        const res = await api.get(`/products?${query.toString()}`);
        if (res.data.success) {
          setProducts(res.data.products);
          setTotalProducts(res.data.totalProducts);
          setTotalPages(res.data.totalPages);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [searchParams, currentPage]);

  // Apply filters by pushing new query params to URL
  const applyFilters = (newSort = selectedSort, newPage = 1) => {
    const query = new URLSearchParams();
    
    const searchVal = searchParams.get("search");
    if (searchVal) query.set("search", searchVal);

    if (selectedCategory) query.set("category", selectedCategory);
    if (selectedSubcategory) query.set("subcategory", selectedSubcategory);
    if (selectedBrands) query.set("brand", selectedBrands);
    if (minPrice) query.set("minPrice", minPrice);
    if (maxPrice) query.set("maxPrice", maxPrice);
    if (selectedColor) query.set("color", selectedColor);
    if (selectedSize) query.set("size", selectedSize);
    
    // Boolean filters (check if exist in URL)
    const featured = searchParams.get("featured");
    const trending = searchParams.get("trending");
    const bestSeller = searchParams.get("bestSeller");
    if (featured) query.set("featured", featured);
    if (trending) query.set("trending", trending);
    if (bestSeller) query.set("bestSeller", bestSeller);

    query.set("sort", newSort);
    query.set("page", newPage.toString());

    setCurrentPage(newPage);
    router.push(`/search?${query.toString()}`);
  };

  const handleBrandChange = (brandName) => {
    let brandsArr = selectedBrands ? selectedBrands.split(",") : [];
    if (brandsArr.includes(brandName)) {
      brandsArr = brandsArr.filter(b => b !== brandName);
    } else {
      brandsArr.push(brandName);
    }
    setSelectedBrands(brandsArr.join(","));
  };

  const handleClearFilters = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedBrands("");
    setMinPrice("");
    setMaxPrice("");
    setSelectedColor("");
    setSelectedSize("");
    router.push("/search");
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors">
        
        {/* Title / Info bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 pb-6 dark:border-zinc-900">
          <div>
            <h1 className="text-xl font-extrabold uppercase tracking-wider">
              {searchParams.get("search") ? `Search results for: "${searchParams.get("search")}"` : "Catalog"}
            </h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">
              Found {totalProducts} premium items matching requirements
            </p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            {/* Filter Toggle Mobile */}
            <button
              onClick={() => setIsFilterPanelOpen(true)}
              className="lg:hidden flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold dark:border-zinc-800"
            >
              <IoFunnelOutline /> Filters
            </button>

            {/* Sort selection */}
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value);
                applyFilters(e.target.value);
              }}
              className="flex-1 sm:flex-initial rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold outline-none dark:border-zinc-800 bg-white dark:bg-zinc-900"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="discount">Biggest Savings</option>
            </select>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* FILTER PANEL DESKTOP */}
          <aside className="hidden lg:flex flex-col gap-6 border-r border-zinc-100 pr-6 dark:border-zinc-900">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider">Department</h3>
                <button onClick={handleClearFilters} className="text-[10px] font-bold text-red-500 uppercase">Clear All</button>
              </div>
              <div className="flex flex-col gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => {
                      setSelectedCategory(selectedCategory === cat.name ? "" : cat.name);
                    }}
                    className={`text-left text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors ${selectedCategory === cat.name ? "bg-zinc-100 text-black dark:bg-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-900" />

            {/* Brands */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4">Brands</h3>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                {brands.map((br) => {
                  const isChecked = selectedBrands.split(",").includes(br);
                  return (
                    <label key={br} className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
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
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-900" />

            {/* Price Filter */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4">Price Range</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs font-bold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs font-bold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-900" />

            {/* Colors */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4">Color Palette</h3>
              <div className="flex flex-wrap gap-1.5">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(selectedColor === c ? "" : c)}
                    className={`rounded-full px-3 py-1 border text-[10px] font-bold transition-all ${selectedColor === c ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-400"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-900" />

            {/* Sizes */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4">Sizing</h3>
              <div className="flex flex-wrap gap-1.5">
                {sizeOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(selectedSize === s ? "" : s)}
                    className={`rounded-lg h-9 w-9 border flex items-center justify-center text-xs font-bold transition-all ${selectedSize === s ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-400"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => applyFilters()}
              className="mt-4 w-full rounded-xl bg-black py-3 text-xs font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Apply Filter Config
            </button>
          </aside>

          {/* PRODUCT LIST GRIDS */}
          <div className="lg:col-span-3 flex flex-col gap-10">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-4xl mb-4">🔍</span>
                <h3 className="text-base font-bold uppercase">No products match search criteria</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 max-w-xs">
                  We couldn't find matches. Try clearing some filters or exploring a different keyword.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="mt-6 rounded-full bg-zinc-900 px-6 py-2.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-black"
                >
                  Reset Catalog View
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {products.map((prod) => (
                  <ProductCard key={prod._id} product={prod} />
                ))}
              </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => applyFilters(selectedSort, currentPage - 1)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-black disabled:opacity-50 dark:border-zinc-800"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const page = idx + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => applyFilters(selectedSort, page)}
                      className={`rounded-lg h-8 w-8 text-xs font-bold transition-all ${currentPage === page ? "bg-black text-white dark:bg-white dark:text-black" : "border border-zinc-200 text-zinc-500 hover:text-black dark:border-zinc-800"}`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => applyFilters(selectedSort, currentPage + 1)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-black disabled:opacity-50 dark:border-zinc-800"
                >
                  Next
                </button>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* FILTER DRAWER MOBILE */}
      {isFilterPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setIsFilterPanelOpen(false)} />
          <div className="z-10 flex w-80 flex-col bg-white p-6 shadow-2xl dark:bg-zinc-950 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wider">Search Filters</h3>
              <button onClick={() => setIsFilterPanelOpen(false)} className="text-2xl text-zinc-500 hover:text-zinc-800"><IoCloseOutline /></button>
            </div>
            
            {/* Filter Content */}
            <div className="flex flex-col gap-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2">Departments</h4>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat._id}
                      onClick={() => setSelectedCategory(selectedCategory === cat.name ? "" : cat.name)}
                      className={`rounded-lg px-3 py-1.5 text-xs border font-semibold ${selectedCategory === cat.name ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white" : "border-zinc-200 text-zinc-500"}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2">Price Limit</h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min ₹"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900"
                  />
                  <input
                    type="number"
                    placeholder="Max ₹"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  applyFilters();
                  setIsFilterPanelOpen(false);
                }}
                className="w-full rounded-xl bg-black py-3 text-xs font-bold text-white dark:bg-white dark:text-black"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default SearchPage;
