import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import WebsiteSettings from "../models/WebsiteSettings.js";

// 1. Get Dashboard Analytics (Admin & Owner)
export const getDashboardStats = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments({ role: "Customer" });
    const totalDeliveryPartners = await User.countDocuments({ role: "Delivery Partner" });

    // Aggregate total revenue
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: "Paid", orderStatus: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$pricing.total" } } }
    ]);
    const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Monthly Sales Graph Data (Simulated/Aggregated)
    const monthlySales = await Order.aggregate([
      {
        $match: {
          paymentStatus: "Paid",
          orderStatus: { $ne: "Cancelled" }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          sales: { $sum: "$pricing.total" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const graphData = monthlySales.map(item => ({
      name: months[item._id - 1] || "Month",
      sales: item.sales,
      orders: item.count
    }));

    // Inventory status (Low Stock Alerts)
    const lowStockAlerts = await Product.find({ stock: { $lte: 15 } })
      .select("title sku stock brand images")
      .limit(10);

    // Categories Share
    const categoryStats = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    const populatedCategoryStats = await Category.populate(categoryStats, { path: "_id", select: "name" });
    
    const categoryShare = populatedCategoryStats.map(stat => ({
      name: stat._id ? stat._id.name : "Uncategorized",
      value: stat.count
    }));

    // Owner specific stats (Profit, Expenses, Employees)
    const profit = Math.round(revenue * 0.40); // 40% gross margin simulation
    const employeeCount = await User.countDocuments({ role: { $in: ["Admin", "Delivery Partner"] } }) + 3; // internal staff
    const expenses = Math.round(revenue * 0.15 + employeeCount * 25000); // 15% operations + employee salaries
    const netProfit = profit - expenses;

    res.status(200).json({
      success: true,
      stats: {
        revenue,
        ordersCount: totalOrders,
        productsCount: totalProducts,
        customersCount: totalUsers,
        deliveryPartnersCount: totalDeliveryPartners,
        lowStockCount: lowStockAlerts.length,
        graphData,
        lowStockAlerts,
        categoryShare,
        business: {
          profit,
          expenses,
          netProfit,
          employeeCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Website Settings
export const getSettings = async (req, res, next) => {
  try {
    let settings = await WebsiteSettings.findOne();
    if (!settings) {
      settings = await WebsiteSettings.create({});
    }
    res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

// 3. Update Website Settings (Admin/Owner)
export const updateSettings = async (req, res, next) => {
  try {
    let settings = await WebsiteSettings.findOne();
    if (!settings) {
      settings = new WebsiteSettings();
    }

    // Merge updates
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      settings[key] = updates[key];
    });

    await settings.save();

    res.status(200).json({
      success: true,
      message: "Website settings updated successfully",
      settings
    });
  } catch (error) {
    next(error);
  }
};

// 4. Get All Users List (Admin/Owner)
export const getAllUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) {
      filter.role = role;
    }
    const users = await User.find(filter).select("-cart -wishlist -likes").sort("-createdAt");
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

// 5. Update User Status / Role (Admin/Owner)
export const updateUserRoleAndStatus = async (req, res, next) => {
  try {
    const { role, isActive, walletBalance } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Protect super admin role changes
    if (user.role === "Super Admin" && req.user.role !== "Super Admin") {
      return res.status(403).json({ success: false, message: "Only Super Admins can edit Super Admin accounts" });
    }

    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (walletBalance !== undefined) user.walletBalance = Number(walletBalance);

    await user.save();

    res.status(200).json({
      success: true,
      message: "User account updated successfully",
      user
    });
  } catch (error) {
    next(error);
  }
};
