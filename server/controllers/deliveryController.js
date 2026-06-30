import Order from "../models/Order.js";

// 1. Get Assigned Orders for Delivery Partner
export const getAssignedOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      deliveryPartner: req.user._id,
      orderStatus: { $in: ["Confirmed", "Packed", "Shipped", "OutForDelivery"] }
    })
      .populate("customer", "name mobile email")
      .populate("items.product", "title images brand")
      .sort("-updatedAt");

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// 2. Accept Order Assignment
export const acceptOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.deliveryPartner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "This order is not assigned to you" });
    }

    if (order.orderStatus === "Pending") {
      return res.status(400).json({ success: false, message: "Order is not yet packed by admin" });
    }

    order.orderStatus = "Shipped";
    order.trackingHistory.push({
      status: "Shipped",
      message: "Order picked up by delivery partner and is in transit."
    });
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order accepted. In transit.",
      order
    });
  } catch (error) {
    next(error);
  }
};

// 3. Reject Order Assignment (Reassign to Pool)
export const rejectOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.deliveryPartner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "This order is not assigned to you" });
    }

    // Set deliveryPartner to null so it returns to admin pool
    order.deliveryPartner = undefined;
    order.trackingHistory.push({
      status: order.orderStatus,
      message: "Assigned delivery partner rejected the delivery task. Reassigning."
    });
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order assignment rejected successfully"
    });
  } catch (error) {
    next(error);
  }
};

// 4. Verify Delivery OTP and mark Delivered
export const verifyDeliveryOTP = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const order = await Order.findById(req.params.id).populate("customer", "name mobile");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.deliveryPartner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (order.orderStatus !== "OutForDelivery") {
      return res.status(400).json({ success: false, message: "Order is not marked out for delivery yet" });
    }

    if (order.otpForDelivery !== otp) {
      return res.status(400).json({ success: false, message: "Invalid delivery OTP. Please double-check with the customer." });
    }

    // Success: Mark Delivered
    order.orderStatus = "Delivered";
    if (order.paymentMethod === "COD") {
      order.paymentStatus = "Paid";
    }
    order.otpForDelivery = undefined; // clear OTP
    
    order.trackingHistory.push({
      status: "Delivered",
      message: "Verified delivery OTP. Order delivered successfully."
    });
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order successfully delivered!",
      order
    });
  } catch (error) {
    next(error);
  }
};

// 5. Get Delivery Partner Earnings
export const getEarnings = async (req, res, next) => {
  try {
    const deliveredOrders = await Order.find({
      deliveryPartner: req.user._id,
      orderStatus: "Delivered"
    }).select("orderNumber pricing total updatedAt");

    // Standard payout: ₹60 per delivery
    const payoutPerDelivery = 60;
    const totalEarnings = deliveredOrders.length * payoutPerDelivery;

    res.status(200).json({
      success: true,
      deliveredCount: deliveredOrders.length,
      payoutPerDelivery,
      totalEarnings,
      trips: deliveredOrders
    });
  } catch (error) {
    next(error);
  }
};
