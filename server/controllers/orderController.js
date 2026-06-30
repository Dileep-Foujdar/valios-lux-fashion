import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import WebsiteSettings from "../models/WebsiteSettings.js";
import { sendEmail, emailTemplates } from "../utils/email.js";
import { sendSMS, smsTemplates } from "../utils/sms.js";

// Helper to calculate total pricing details
const calculateOrderPricing = async (items, couponCode) => {
  let subtotal = 0;
  
  // Calculate subtotal and verify stock
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw new Error(`Product not found`);
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.title}. Only ${product.stock} items left.`);
    }
    subtotal += product.salePrice * item.quantity;
    item.price = product.salePrice; // Keep track of checkout price
  }

  // Load website settings
  let gstPercent = 18;
  let defaultCharge = 99;
  let minFreeDelivery = 999;
  
  const settings = await WebsiteSettings.findOne();
  if (settings) {
    gstPercent = settings.taxPercentage.gst || 18;
    defaultCharge = settings.deliveryCharges.defaultCharge || 99;
    minFreeDelivery = settings.deliveryCharges.minAmountForFreeDelivery || 999;
  }

  // Calculate taxes and shipping
  const gst = Math.round(subtotal * (gstPercent / 100));
  const shipping = subtotal >= minFreeDelivery ? 0 : defaultCharge;

  // Coupon Discount
  let couponDiscount = 0;
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
        }
      }
    }
  }

  const total = subtotal + gst + shipping - couponDiscount;

  return {
    subtotal,
    gst,
    shipping,
    couponDiscount,
    total
  };
};

// 1. Create New Order
export const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod, couponCode, useWallet } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items in order" });
    }

    if (!shippingAddress) {
      return res.status(400).json({ success: false, message: "Please provide shipping address" });
    }

    // Calculate pricing details
    let pricing;
    try {
      pricing = await calculateOrderPricing(items, couponCode);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    let finalTotal = pricing.total;
    let walletDeducted = 0;
    
    // Wallet handling
    const user = await User.findById(req.user._id);
    if (useWallet === true || useWallet === "true") {
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
        ...pricing,
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
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Safety checks
    if (order.customer.toString() !== req.user._id.toString() && !["Admin", "Owner", "Super Admin"].includes(req.user.role)) {
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
      await User.findByIdAndUpdate(order.customer, { $inc: { walletBalance: refundAmount } });
      order.paymentStatus = "Refunded";
    }

    await order.save();

    // Send Cancellation alerts
    const customer = await User.findById(order.customer);
    await sendSMS({
      to: customer.mobile,
      body: smsTemplates.cancelled(order.orderNumber)
    });

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
    const order = await Order.findById(req.params.id);

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

      // Special transitions
      if (status === "OutForDelivery") {
        // Generate secure delivery OTP
        const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
        order.otpForDelivery = deliveryOtp;
        
        // Notify Customer with OTP
        const customer = await User.findById(order.customer);
        await sendSMS({
          to: customer.mobile,
          body: smsTemplates.outForDelivery(order.orderNumber, deliveryOtp)
        });
      }

      if (status === "Delivered") {
        if (order.paymentMethod === "COD") {
          order.paymentStatus = "Paid";
        }
        order.otpForDelivery = undefined; // clear delivery OTP
        
        const customer = await User.findById(order.customer);
        await sendSMS({
          to: customer.mobile,
          body: smsTemplates.delivered(order.orderNumber)
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
