/**
 * Parse loose boolean query/body values from clients.
 * Accepts: true, "true", "TRUE", "1", 1, "yes", "on"
 */
export const parseBool = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  const s = String(value).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
};

/**
 * Resolve product list sort from query string.
 * Supports aliases used by web + mobile clients.
 */
export const resolveProductSort = (sortRaw) => {
  const raw = String(sortRaw || "").trim();
  if (!raw) return { createdAt: -1 };

  const lower = raw.toLowerCase();

  // Named aliases (web UI)
  if (lower === "price-low" || lower === "priceasc" || lower === "price" || lower === "saleprice") {
    return { salePrice: 1 };
  }
  if (lower === "price-high" || lower === "pricedesc") {
    return { salePrice: -1 };
  }
  if (lower === "rating") return { rating: -1, reviewCount: -1 };
  if (lower === "newest") return { createdAt: -1 };
  if (lower === "discount") return { discount: -1 };
  if (lower === "sold" || lower === "bestselling") return { soldCount: -1 };
  if (lower === "popular") return { viewCount: -1, soldCount: -1 };
  if (lower === "featured") return { featured: -1, rating: -1, createdAt: -1 };

  // Mongo-style field / -field
  const desc = raw.startsWith("-");
  const field = (desc ? raw.slice(1) : raw).trim();
  const normalized = field.toLowerCase();

  if (normalized === "saleprice" || normalized === "price") {
    return { salePrice: desc ? -1 : 1 };
  }
  if (normalized === "createdat") return { createdAt: desc ? -1 : 1 };
  if (normalized === "rating") return { rating: desc ? -1 : 1 };
  if (normalized === "discount") return { discount: desc ? -1 : 1 };
  if (normalized === "soldcount") return { soldCount: desc ? -1 : 1 };
  if (normalized === "viewcount") return { viewCount: desc ? -1 : 1 };
  if (normalized === "featured") {
    return desc
      ? { featured: 1, createdAt: -1 }
      : { featured: -1, rating: -1, createdAt: -1 };
  }
  if (normalized === "title") return { title: desc ? -1 : 1 };

  return { createdAt: -1 };
};
