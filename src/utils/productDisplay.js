export const DEFAULT_PRODUCT_VISIBILITY = {
  reviews: true,
  ratings: true,
  soldCount: true,
  stockStatus: true,
  offerPrice: true,
  discount: true,
  originalPrice: true,
  brand: true,
  category: true,
  sku: true,
  colors: true,
  sizes: true,
  variants: true,
  wishlist: true,
  compare: true,
  quickView: true,
  buyNow: true,
  addToCart: true,
  specifications: true,
  warranty: true,
  shortDescription: true,
  tags: true
};

export const VISIBILITY_LABELS = {
  reviews: "Reviews",
  ratings: "Ratings",
  soldCount: "Sold Count",
  stockStatus: "Stock Status",
  offerPrice: "Offer Price",
  discount: "Discount Percentage",
  originalPrice: "Original Price (MRP)",
  brand: "Product Brand",
  category: "Product Category",
  sku: "Product SKU",
  colors: "Product Colors",
  sizes: "Product Sizes",
  variants: "Product Variants",
  wishlist: "Wishlist Button",
  compare: "Compare Button",
  quickView: "Quick View Button",
  buyNow: "Buy Now Button",
  addToCart: "Add to Cart Button",
  specifications: "Specifications",
  warranty: "Warranty",
  shortDescription: "Short Description",
  tags: "Tags"
};

export const resolveProductVisibility = (product, globalVisibility = {}) => {
  const global = { ...DEFAULT_PRODUCT_VISIBILITY, ...(globalVisibility || {}) };
  const local = product?.displayConfig || {};
  const resolved = {};

  Object.keys(DEFAULT_PRODUCT_VISIBILITY).forEach((key) => {
    if (typeof local[key] === "boolean") resolved[key] = local[key];
    else resolved[key] = global[key] !== false;
  });

  return resolved;
};

export const isBadgeActive = (badge, now = new Date()) => {
  if (!badge || badge.enabled === false) return false;
  if (badge.startDate && new Date(badge.startDate) > now) return false;
  if (badge.endDate && new Date(badge.endDate) < now) return false;
  return true;
};

export const getActiveProductBadges = (product, now = new Date()) => {
  const assigned = Array.isArray(product?.badges) ? product.badges : [];
  const active = assigned
    .filter((b) => isBadgeActive(b, now))
    .sort((a, b) => (Number(a.priority) || 999) - (Number(b.priority) || 999));

  if (active.length > 0) return active;

  const legacy = [];
  if (product?.newArrival || product?.latest) {
    legacy.push({ key: "new", label: "New", color: "#111111", priority: 10, enabled: true });
  }
  if (product?.trending) {
    legacy.push({ key: "trending", label: "Trending", color: "#0284c7", priority: 20, enabled: true });
  }
  if (product?.bestSeller) {
    legacy.push({ key: "best_seller", label: "Best Seller", color: "#d97706", priority: 30, enabled: true });
  }
  if (product?.featured) {
    legacy.push({ key: "featured", label: "Featured", color: "#4f46e5", priority: 40, enabled: true });
  }
  if (product?.offerProduct || (Number(product?.discount) || 0) > 0) {
    legacy.push({ key: "sale", label: "Sale", color: "#ef4444", priority: 15, enabled: true });
  }
  const stock = Number(product?.stock) || 0;
  const threshold = Number(product?.lowStockThreshold) || 15;
  if (stock > 0 && stock <= threshold) {
    legacy.push({ key: "limited_stock", label: "Limited Stock", color: "#ea580c", priority: 60, enabled: true });
  }
  return legacy.sort((a, b) => (a.priority || 999) - (b.priority || 999));
};
