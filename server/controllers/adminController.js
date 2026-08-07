import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Review from "../models/Review.js";
import WebsiteSettings from "../models/WebsiteSettings.js";
import {
  DEFAULT_PRODUCT_VISIBILITY,
  DEFAULT_BADGE_LIBRARY,
  sanitizeStorefrontSettings
} from "../utils/productDisplay.js";

const paidMatch = {
  paymentStatus: "Paid",
  orderStatus: { $ne: "Cancelled" }
};

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfMonth = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
};

const buildSeries = async (model, match, dateField, unit, buckets, valueExpr, { coerceDate = false } = {}) => {
  const since = new Date();
  if (unit === "day") since.setDate(since.getDate() - (buckets - 1));
  if (unit === "week") since.setDate(since.getDate() - buckets * 7);
  if (unit === "month") since.setMonth(since.getMonth() - (buckets - 1));

  const truncUnit = unit === "week" ? "week" : unit === "month" ? "month" : "day";
  const dateExpr = coerceDate ? { $toDate: `$${dateField}` } : `$${dateField}`;

  const pipeline = [
    { $match: match },
    { $addFields: { _seriesDate: dateExpr } },
    { $match: { _seriesDate: { $gte: since } } },
    {
      $group: {
        _id: { $dateTrunc: { date: "$_seriesDate", unit: truncUnit } },
        value: valueExpr,
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const rows = await model.aggregate(pipeline);

  return rows.map((r) => ({
    date: r._id,
    name:
      unit === "month"
        ? new Date(r._id).toLocaleString("en-US", { month: "short", year: "2-digit" })
        : unit === "week"
          ? `W${Math.ceil(new Date(r._id).getDate() / 7)} ${new Date(r._id).toLocaleString("en-US", { month: "short" })}`
          : new Date(r._id).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    sales: r.value || 0,
    orders: r.count || 0,
    customers: r.count || 0
  }));
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const todayStart = startOfDay();
    const monthStart = startOfMonth();
    const range = (req.query.range || "month").toLowerCase(); // day | week | month

    const [
      totalOrders,
      totalProducts,
      totalUsers,
      totalDeliveryPartners,
      revenueResult,
      salesTodayResult,
      monthlyRevenueResult,
      pendingOrders,
      cancelledOrders,
      lowStockCount,
      outOfStockCount,
      lowStockAlerts,
      recentOrders,
      latestCustomers,
      topProductsAgg,
      topCategoriesAgg,
      topBrandsAgg,
      recentReviews,
      recentProducts
    ] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: "Customer" }),
      User.countDocuments({ role: "Delivery Partner" }),
      Order.aggregate([
        { $match: paidMatch },
        { $group: { _id: null, total: { $sum: "$pricing.total" } } }
      ]),
      Order.aggregate([
        { $match: { ...paidMatch, createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: "$pricing.total" }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { ...paidMatch, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: "$pricing.total" } } }
      ]),
      Order.countDocuments({ orderStatus: "Pending" }),
      Order.countDocuments({ orderStatus: "Cancelled" }),
      Product.countDocuments({
        $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 15] }] }] }
      }),
      Product.countDocuments({ stock: { $lte: 0 } }),
      Product.find({
        $expr: { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 15] }] }
      })
        .select("title sku stock brand images lowStockThreshold")
        .sort("stock")
        .limit(10),
      Order.find()
        .sort("-createdAt")
        .limit(10)
        .populate("customer", "name email")
        .populate("items.product", "title images"),
      User.find({ role: "Customer" }).sort("-createdAt").limit(10).select("name email mobile createdAt"),
      Order.aggregate([
        { $match: paidMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            units: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
          }
        },
        { $sort: { units: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product"
          }
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } }
      ]),
      Order.aggregate([
        { $match: paidMatch },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "product"
          }
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$product.category",
            units: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 6 },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category"
          }
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } }
      ]),
      Order.aggregate([
        { $match: paidMatch },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "product"
          }
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$product.brand",
            units: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
          }
        },
        { $match: { _id: { $ne: null } } },
        { $sort: { revenue: -1 } },
        { $limit: 6 }
      ]),
      Review.find().sort("-createdAt").limit(8).populate("user", "name").populate("product", "title"),
      Product.find().sort("-createdAt").limit(8).select("title createdAt status stock")
    ]);

    const revenue = revenueResult[0]?.total || 0;
    const salesToday = salesTodayResult[0]?.total || 0;
    const salesTodayOrders = salesTodayResult[0]?.count || 0;
    const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;

    let seriesConfig = { unit: "month", buckets: 12 };
    if (range === "day") seriesConfig = { unit: "day", buckets: 30 };
    if (range === "week") seriesConfig = { unit: "week", buckets: 12 };

    const [revenueSeries, ordersSeries, customerGrowth] = await Promise.all([
      buildSeries(Order, paidMatch, "createdAt", seriesConfig.unit, seriesConfig.buckets, { $sum: "$pricing.total" }),
      buildSeries(Order, {}, "createdAt", seriesConfig.unit, seriesConfig.buckets, { $sum: 1 }),
      buildSeries(
        User,
        { role: "Customer" },
        "createdAt",
        seriesConfig.unit,
        seriesConfig.buckets,
        { $sum: 1 },
        { coerceDate: true }
      )
    ]);

    // Prefer User.createdAt; if schema stores string createdAt on some docs, aggregate still works on timestamps.createdAt
    const activityTimeline = [
      ...recentOrders.map((o) => ({
        type: "order",
        title: `Order #${o.orderNumber}`,
        meta: `${o.customer?.name || "Customer"} · ₹${o.pricing?.total || 0} · ${o.orderStatus}`,
        at: o.createdAt
      })),
      ...recentReviews.map((r) => ({
        type: "review",
        title: `Review on ${r.product?.title || "product"}`,
        meta: `${r.user?.name || "Customer"} · ${r.rating}★`,
        at: r.createdAt
      })),
      ...recentProducts.map((p) => ({
        type: "product",
        title: `Product ${p.title}`,
        meta: `${p.status || "published"} · stock ${p.stock}`,
        at: p.createdAt
      }))
    ]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 20);

    const categoryShare = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    const populatedCategoryStats = await Category.populate(categoryShare, { path: "_id", select: "name" });

    const profit = Math.round(revenue * 0.4);
    const employeeCount =
      (await User.countDocuments({ role: { $in: ["Admin", "Delivery Partner"] } })) + 3;
    const expenses = Math.round(revenue * 0.15 + employeeCount * 25000);

    res.status(200).json({
      success: true,
      stats: {
        revenue,
        ordersCount: totalOrders,
        productsCount: totalProducts,
        customersCount: totalUsers,
        deliveryPartnersCount: totalDeliveryPartners,
        salesToday,
        salesTodayOrders,
        monthlyRevenue,
        pendingOrders,
        cancelledOrders,
        lowStockCount,
        outOfStockCount,
        lowStockAlerts,
        graphData: revenueSeries,
        revenueSeries,
        ordersSeries,
        salesTrend: revenueSeries,
        customerGrowth: customerGrowth.map((c) => ({
          name: c.name,
          date: c.date,
          customers: c.customers
        })),
        topSellingProducts: topProductsAgg.map((p) => ({
          _id: p._id,
          title: p.product?.title || "Deleted product",
          image: p.product?.images?.[0] || "",
          units: p.units,
          revenue: p.revenue
        })),
        recentOrders,
        latestCustomers,
        topCategories: topCategoriesAgg.map((c) => ({
          name: c.category?.name || "Uncategorized",
          units: c.units,
          revenue: c.revenue
        })),
        topBrands: topBrandsAgg.map((b) => ({
          name: b._id,
          units: b.units,
          revenue: b.revenue
        })),
        activityTimeline,
        categoryShare: populatedCategoryStats.map((stat) => ({
          name: stat._id ? stat._id.name : "Uncategorized",
          value: stat.count
        })),
        range,
        business: {
          profit,
          expenses,
          netProfit: profit - expenses,
          employeeCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const ensureSettingsDefaults = (settings) => {
  if (!settings.productVisibility || (settings.productVisibility instanceof Map && settings.productVisibility.size === 0)) {
    settings.productVisibility = new Map(Object.entries(DEFAULT_PRODUCT_VISIBILITY));
  }
  if (!Array.isArray(settings.badgeLibrary) || settings.badgeLibrary.length === 0) {
    settings.badgeLibrary = DEFAULT_BADGE_LIBRARY.map((b) => ({ ...b }));
  }
  if (!settings.storefront) {
    settings.storefront = {
      showProductCounts: false,
      showCategoryCounts: false,
      showBrandCounts: false
    };
  }
  return settings;
};

const serializeSettings = (settings, { publicOnly = false } = {}) => {
  const obj = settings.toObject({ flattenMaps: true });
  if (!obj.productVisibility || typeof obj.productVisibility !== "object") {
    obj.productVisibility = { ...DEFAULT_PRODUCT_VISIBILITY };
  } else {
    obj.productVisibility = { ...DEFAULT_PRODUCT_VISIBILITY, ...obj.productVisibility };
  }
  if (!Array.isArray(obj.badgeLibrary) || obj.badgeLibrary.length === 0) {
    obj.badgeLibrary = DEFAULT_BADGE_LIBRARY.map((b) => ({ ...b }));
  }
  if (publicOnly) return sanitizeStorefrontSettings(obj);
  return obj;
};

export const getSettings = async (req, res, next) => {
  try {
    let settings = await WebsiteSettings.findOne();
    if (!settings) {
      settings = await WebsiteSettings.create({});
    } else {
      const before = JSON.stringify({
        pv: settings.productVisibility instanceof Map
          ? settings.productVisibility.size
          : Object.keys(settings.productVisibility || {}).length,
        bl: settings.badgeLibrary?.length || 0
      });
      ensureSettingsDefaults(settings);
      const after = JSON.stringify({
        pv: settings.productVisibility instanceof Map
          ? settings.productVisibility.size
          : Object.keys(settings.productVisibility || {}).length,
        bl: settings.badgeLibrary?.length || 0
      });
      if (before !== after) await settings.save();
    }

    // Public storefront clients should not receive secrets
    const isAuthedAdmin =
      req.user && ["Admin", "Owner", "Super Admin"].includes(req.user.role);
    const payload = serializeSettings(settings, { publicOnly: !isAuthedAdmin });

    res.status(200).json({ success: true, settings: payload });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    let settings = await WebsiteSettings.findOne();
    if (!settings) {
      settings = new WebsiteSettings();
    }

    const updates = req.body || {};
    const allowed = [
      "theme",
      "seo",
      "smtp",
      "sms",
      "paymentConfig",
      "bannerImages",
      "heroSlider",
      "footerDetails",
      "deliveryCharges",
      "taxPercentage",
      "productVisibility",
      "badgeLibrary",
      "storefront"
    ];

    allowed.forEach((key) => {
      if (updates[key] !== undefined) {
        if (key === "productVisibility") {
          settings.productVisibility = new Map(
            Object.entries({ ...DEFAULT_PRODUCT_VISIBILITY, ...updates.productVisibility })
          );
        } else {
          settings[key] = updates[key];
        }
      }
    });

    ensureSettingsDefaults(settings);
    await settings.save();
    res.status(200).json({
      success: true,
      message: "Settings updated",
      settings: serializeSettings(settings, { publicOnly: false })
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const users = await User.find(filter).select("-password").sort("-createdAt");
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

export const updateUserRoleAndStatus = async (req, res, next) => {
  try {
    const { role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (role) user.role = role;
    if (typeof isActive === "boolean") user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated",
      user
    });
  } catch (error) {
    next(error);
  }
};
