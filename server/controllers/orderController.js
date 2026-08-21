import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import WebsiteSettings from "../models/WebsiteSettings.js";
import { sendEmail, emailTemplates } from "../utils/email.js";
import { sendSMS, smsTemplates } from "../utils/sms.js";
import { applyOrderSalesMetrics } from "../utils/productMetrics.js";
import { parseBool } from "../utils/queryHelpers.js";

// Helper to calculate total pricing details
const calculateOrderPricing = async (items, couponCode) => {
  let subtotal = 0;
  const pricedItems = [];

  // Calculate subtotal and verify stock
  for (const item of items) {
    const productId = item.product || item.productId;
    const product = await Product.findById(productId);
    if (!product) throw new Error(`Product not found`);
    if (product.stock < item.quantity) {
      const err = new Error(`Insufficient stock for ${product.title}. Only ${product.stock} items left.`);
      err.code = "OUT_OF_STOCK";
      throw err;
    }
    const linePrice = product.salePrice * item.quantity;
    subtotal += linePrice;
    item.price = product.salePrice; // Keep track of checkout price
    item.product = productId;
    pricedItems.push({
      product: productId,
      title: product.title,
      quantity: item.quantity,
      price: product.salePrice,
      lineTotal: linePrice,
      color: item.color || "",
      size: item.size || ""
    });
  }

  // Load website settings
  let gstPercent = 18;
  let defaultCharge = 99;
  let minFreeDelivery = 999;

  const settings = await WebsiteSettings.findOne();
  if (settings) {
    gstPercent = settings.taxPercentage?.gst || 18;
    defaultCharge = settings.deliveryCharges?.defaultCharge || 99;
    minFreeDelivery = settings.deliveryCharges?.minAmountForFreeDelivery || 999;
  }

  // Calculate taxes and shipping
  const gst = Math.round(subtotal * (gstPercent / 100));
  const shipping = subtotal >= minFreeDelivery ? 0 : defaultCharge;

  // Coupon Discount
  let couponDiscount = 0;
  let couponApplied = null;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (coupon) {
      const now = new Date();
      if (coupon.expiryDate > now && (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)) {
        if (subtotal >= coupon.minPurchase) {
          if (coupon.discountType === "Percentage") {
            couponDiscount = Math.round(subtotal * (coupon.value / 100));
            if (coupon.maxDiscount > 0 && couponDiscount > coupon.maxDiscount) {
              couponDiscount = coupon.maxDiscount;
            }
          } else {
            couponDiscount = coupon.value;
          }
          couponApplied = coupon.code;
        }
      }
    }
  }

  const total = Math.max(0, subtotal + gst + shipping - couponDiscount);

  return {
    subtotal,
    gst,
    shipping,
    couponDiscount,
    total,
    gstPercent,
    freeShippingThreshold: minFreeDelivery,
    couponApplied,
    items: pricedItems
  };
};

/** Preview checkout totals without placing an order */
export const previewOrder = async (req, res, next) => {
  try {
    let { items, couponCode, useWallet } = req.body || {};

    // Allow preview from current cart when items omitted
    if (!items || items.length === 0) {
      const user = await User.findById(req.user._id).populate("cart.product", "salePrice stock title");
      items = (user.cart || [])
        .filter((c) => c.product && c.product._id)
        .map((c) => ({
          product: c.product._id,
          quantity: c.quantity,
          color: c.color,
          size: c.size
        }));
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items to preview", code: "EMPTY_CART" });
    }

    let pricing;
    try {
      pricing = await calculateOrderPricing(items, couponCode);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
        code: err.code || "PRICING_ERROR"
      });
    }

    let walletUsed = 0;
    let amountToPay = pricing.total;
    const user = await User.findById(req.user._id).select("walletBalance");

    if (parseBool(useWallet) && user?.walletBalance > 0) {
      walletUsed = Math.min(user.walletBalance, pricing.total);
      amountToPay = pricing.total - walletUsed;
    }

    res.status(200).json({
      success: true,
      pricing: {
        subtotal: pricing.subtotal,
        couponDiscount: pricing.couponDiscount,
        gst: pricing.gst,
        shipping: pricing.shipping,
        walletUsed,
        total: amountToPay,
        // gross before wallet for clarity
        grandTotal: pricing.total
      },
      subtotal: pricing.subtotal,
      couponDiscount: pricing.couponDiscount,
      gst: pricing.gst,
      shipping: pricing.shipping,
      walletUsed,
      total: amountToPay,
      gstPercent: pricing.gstPercent,
      freeShippingThreshold: pricing.freeShippingThreshold,
      couponApplied: pricing.couponApplied,
      items: pricing.items
    });
  } catch (error) {
    next(error);
  }
};

// 1. Create New Order
export const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod, couponCode, useWallet } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items in order", code: "EMPTY_CART" });
    }

    if (!shippingAddress) {
      return res.status(400).json({ success: false, message: "Please provide shipping address" });
    }

    const { isValidIndianMobile, normalizeIndianMobile, isValidPin } = await import("../utils/cryptoSensitive.js");
    const phone = normalizeIndianMobile(shippingAddress.phone);
    if (!isValidIndianMobile(phone)) {
      return res.status(400).json({ success: false, message: "A valid mobile number is required for delivery" });
    }
    if (!shippingAddress.name?.trim() || !shippingAddress.street?.trim() || !shippingAddress.city?.trim() || !shippingAddress.state?.trim()) {
      return res.status(400).json({ success: false, message: "Incomplete shipping address" });
    }
    if (!isValidPin(shippingAddress.zipCode)) {
      return res.status(400).json({ success: false, message: "Enter a valid 6-digit PIN code" });
    }

    shippingAddress.phone = phone;
    shippingAddress.country = shippingAddress.country || "India";
    shippingAddress.houseNo = shippingAddress.houseNo || "";
    shippingAddress.landmark = shippingAddress.landmark || "";

    // Calculate pricing details
    let pricing;
    try {
      pricing = await calculateOrderPricing(items, couponCode);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message, code: err.code || "PRICING_ERROR" });
    }

    let finalTotal = pricing.total;
    let walletDeducted = 0;

    // Wallet handling
    const user = await User.findById(req.user._id);
    if (parseBool(useWallet)) {
      if (user.walletBalance > 0) {
        if (user.walletBalance >= finalTotal) {
          walletDeducted = finalTotal;
          finalTotal = 0;
        } else {
          walletDeducted = user.walletBalance;
          finalTotal -= walletDeducted;
        }
      }
    }

    // Create order number
    const orderNumber = "ORD-" + Date.now().toString() + Math.floor(1000 + Math.random() * 9000).toString();

    // Create order document
    const order = await Order.create({
      orderNumber,
      customer: req.user._id,
      items,
      shippingAddress,
      paymentMethod,
      paymentStatus: finalTotal === 0 ? "Paid" : "Pending",
      orderStatus: "Pending",
      pricing: {
        subtotal: pricing.subtotal,
        gst: pricing.gst,
        shipping: pricing.shipping,
        couponDiscount: pricing.couponDiscount,
        total: finalTotal // Net total to pay online/COD
      },
      trackingHistory: [{ status: "Pending", message: "Order placed successfully" }]
    });

    // Populate products for display in emails/response
    const populatedOrder = await Order.findById(order._id).populate("items.product", "title images salePrice");

    // Deduct stock and increment coupon usage if needed
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { code: couponCode.toUpperCase() },
        { $inc: { usedCount: 1 }, $push: { usersUsed: req.user._id } }
      );
    }

    // Deduct wallet balance if used
    if (walletDeducted > 0) {
      user.walletBalance -= walletDeducted;
      await user.save();
    }

    // Clear user cart
    await User.findByIdAndUpdate(req.user._id, { $set: { cart: [] } });

    // Fully wallet-paid orders count as sales immediately
    if (finalTotal === 0) {
      await applyOrderSalesMetrics(populatedOrder).catch(() => {});
    }

    // Send confirmations if COD (or fully paid by wallet)
    if (paymentMethod === "COD" || finalTotal === 0) {
      // Send Email
      await sendEmail({
        to: req.user.email,
        subject: `Order Confirmed: #${orderNumber}`,
        html: emailTemplates.orderConfirmation(populatedOrder),
        text: `Your order #${orderNumber} of amount ₹${pricing.total} is confirmed.`
      });

      // Send SMS
      await sendSMS({
        to: req.user.mobile,
        body: smsTemplates.orderConfirmed(orderNumber)
      });

      // Realtime notification via Socket.io
      if (req.io) {
        req.io.emit("newOrder", {
          orderNumber,
          customer: req.user.name,
          total: pricing.total
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: populatedOrder,
      pricing: {
        subtotal: pricing.subtotal,
        couponDiscount: pricing.couponDiscount,
        gst: pricing.gst,
        shipping: pricing.shipping,
        walletUsed: walletDeducted,
        total: finalTotal
      },
      walletDeducted,
      amountToPay: finalTotal
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Customer's Personal Orders
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate("items.product", "title images salePrice")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get Order by ID
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer", "name email mobile")
      .populate("items.product", "title images brand salePrice")
      .populate("deliveryPartner", "name mobile");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Check permissions: Owner/Admin/assigned delivery, or the customer themselves
    const isCustomer = order.customer._id.toString() === req.user._id.toString();
    const isAdmin = ["Admin", "Owner", "Super Admin"].includes(req.user.role);
    const isAssignedDelivery = order.deliveryPartner && order.deliveryPartner._id.toString() === req.user._id.toString();

    if (!isCustomer && !isAdmin && !isAssignedDelivery) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

// 4. Cancel Order (Customer before Packed/Shipped)
export const cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id).populate("customer");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Safety checks
    const customerId = order.customer._id || order.customer;
    if (customerId.toString() !== req.user._id.toString() && !["Admin", "Owner", "Super Admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (["Shipped", "OutForDelivery", "Delivered"].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: "Order cannot be cancelled after shipping" });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ success: false, message: "Order is already cancelled" });
    }

    // Update status
    order.orderStatus = "Cancelled";
    order.cancellationReason = reason || "Cancelled by user";
    order.trackingHistory.push({
      status: "Cancelled",
      message: `Order cancelled: ${reason || "User requested"}`
    });

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    // Refund online payments or wallet deductions to User Wallet!
    if (order.paymentStatus === "Paid") {
      const refundAmount = order.pricing.total;
      await User.findByIdAndUpdate(customerId, { $inc: { walletBalance: refundAmount } });
      order.paymentStatus = "Refunded";
    }

    await order.save();

    // Send Cancellation alerts
    const customer = order.customer;
    if (customer && customer.mobile) {
      await sendSMS({
        to: customer.mobile,
        body: smsTemplates.cancelled(order.orderNumber)
      });
    }
    if (customer && customer.email) {
      await sendEmail({
        to: customer.email,
        subject: `Order #${order.orderNumber} Cancelled`,
        html: emailTemplates.orderStatusUpdate(order, "Cancelled"),
        text: `Your order #${order.orderNumber} has been cancelled.`
      });
    }

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully, refund credited to wallet if paid",
      order
    });
  } catch (error) {
    next(error);
  }
};

// 5. Update Order Status & Delivery Partner Assignments (Admin/Owner/Delivery)
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, deliveryPartnerId } = req.body;
    const order = await Order.findById(req.params.id).populate("customer");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const currentRole = req.user.role;

    // Delivery Partner only allowed to update if assigned and only to specific statuses
    if (currentRole === "Delivery Partner") {
      if (!order.deliveryPartner || order.deliveryPartner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Access denied. Order not assigned to you." });
      }
    }

    // Update tracking
    if (status) {
      order.orderStatus = status;
      order.trackingHistory.push({
        status,
        message: `Order status changed to ${status}`
      });

      const customer = order.customer;

      let deliveryOtp = undefined;
      // Special transitions
      if (status === "OutForDelivery") {
        // Generate secure delivery OTP
        deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
        order.otpForDelivery = deliveryOtp;
        
        // Notify Customer with OTP
        if (customer && customer.mobile) {
          await sendSMS({
            to: customer.mobile,
            body: smsTemplates.outForDelivery(order.orderNumber, deliveryOtp)
          });
        }
      }

      if (status === "Delivered") {
        const becamePaid = order.paymentMethod === "COD" && order.paymentStatus !== "Paid";
        if (order.paymentMethod === "COD") {
          order.paymentStatus = "Paid";
        }
        order.otpForDelivery = undefined; // clear delivery OTP

        if (becamePaid) {
          await applyOrderSalesMetrics(order).catch(() => {});
        }
        
        if (customer && customer.mobile) {
          await sendSMS({
            to: customer.mobile,
            body: smsTemplates.delivered(order.orderNumber)
          });
        }
      }

      // Send status update email to Customer
      if (customer && customer.email) {
        await sendEmail({
          to: customer.email,
          subject: `Order #${order.orderNumber} Status Update: ${status}`,
          html: emailTemplates.orderStatusUpdate(order, status, deliveryOtp || order.otpForDelivery),
          text: `The status of your order #${order.orderNumber} has been updated to ${status}.` +
                ((status === "OutForDelivery" && (deliveryOtp || order.otpForDelivery)) 
                  ? ` Your secure delivery verification OTP is: ${deliveryOtp || order.otpForDelivery}` 
                  : "")
        });
      }
    }

    // Assign delivery partner
    if (deliveryPartnerId && ["Admin", "Owner", "Super Admin"].includes(currentRole)) {
      order.deliveryPartner = deliveryPartnerId;
      const partner = await User.findById(deliveryPartnerId);
      
      // Notify Delivery Partner
      if (partner) {
        await sendEmail({
          to: partner.email,
          subject: `New Delivery Assigned: #${order.orderNumber}`,
          html: emailTemplates.deliveryAssignment(order, partner),
          text: `You have been assigned to deliver order #${order.orderNumber}.`
        });
        await sendSMS({
          to: partner.mobile,
          body: smsTemplates.deliveryAssigned(order.orderNumber)
        });
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      order
    });
  } catch (error) {
    next(error);
  }
};

// 6. Return or Replace Order
export const returnOrReplaceOrder = async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: Return / Replace
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({ success: false, message: "Only delivered orders can be returned or replaced" });
    }

    const nextStatus = action === "Replace" ? "Replaced" : "Returned";
    order.orderStatus = nextStatus;
    
    if (action === "Replace") {
      order.returnReason = reason;
      order.trackingHistory.push({
        status: "Replaced",
        message: `Replacement requested: ${reason}`
      });
    } else {
      order.returnReason = reason;
      order.trackingHistory.push({
        status: "Returned",
        message: `Return requested: ${reason}. Refund will process after inspection.`
      });

      // Refund to wallet immediately on approval (for ease, refund on return action)
      if (order.paymentStatus === "Paid") {
        await User.findByIdAndUpdate(order.customer, { $inc: { walletBalance: order.pricing.total } });
        order.paymentStatus = "Refunded";
        await applyOrderSalesMetrics(order, { returned: true, refund: true }).catch(() => {});
      } else {
        await applyOrderSalesMetrics(order, { returned: true }).catch(() => {});
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order marked for ${action.toLowerCase()} successfully`,
      order
    });
  } catch (error) {
    next(error);
  }
};

// 7. Get All Orders in the System (Admin/Owner/Super Admin/Delivery)
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("customer", "name email mobile")
      .populate("items.product", "title images brand salePrice")
      .populate("deliveryPartner", "name mobile")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};
