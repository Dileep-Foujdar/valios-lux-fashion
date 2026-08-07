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

export const DEFAULT_BADGE_LIBRARY = [
  { key: "new", label: "New", color: "#111111", icon: "", priority: 10, enabled: true },
  { key: "trending", label: "Trending", color: "#0284c7", icon: "", priority: 20, enabled: true },
  { key: "best_seller", label: "Best Seller", color: "#d97706", icon: "", priority: 30, enabled: true },
  { key: "featured", label: "Featured", color: "#4f46e5", icon: "", priority: 40, enabled: true },
  { key: "hot_deal", label: "Hot Deal", color: "#dc2626", icon: "", priority: 50, enabled: true },
  { key: "limited_stock", label: "Limited Stock", color: "#ea580c", icon: "", priority: 60, enabled: true },
  { key: "flash_sale", label: "Flash Sale", color: "#e11d48", icon: "", priority: 70, enabled: true },
  { key: "recommended", label: "Recommended", color: "#0f766e", icon: "", priority: 80, enabled: true },
  { key: "editors_choice", label: "Editor's Choice", color: "#7c3aed", icon: "", priority: 90, enabled: true },
  { key: "premium", label: "Premium", color: "#a16207", icon: "", priority: 100, enabled: true },
  { key: "sale", label: "Sale", color: "#ef4444", icon: "", priority: 15, enabled: true }
];

export const VISIBILITY_KEYS = Object.keys(DEFAULT_PRODUCT_VISIBILITY);

export const resolveProductVisibility = (product, globalVisibility = {}) => {
  const global = { ...DEFAULT_PRODUCT_VISIBILITY, ...(globalVisibility || {}) };
  const local = product?.displayConfig || {};
  const resolved = {};

  VISIBILITY_KEYS.forEach((key) => {
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

  // Legacy boolean flags fallback (until migrated in admin)
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

export const sanitizeStorefrontSettings = (settings) => {
  if (!settings) return null;
  const obj = typeof settings.toObject === "function" ? settings.toObject() : { ...settings };
  delete obj.smtp;
  delete obj.sms;
  delete obj.paymentConfig;
  return obj;
};
