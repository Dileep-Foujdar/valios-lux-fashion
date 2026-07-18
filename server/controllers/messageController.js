import Message from "../models/Message.js";
import Order from "../models/Order.js";

// Get messages for a specific order
export const getOrderMessages = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Auth check: customer, admin, owner, or assigned delivery partner
    const isCustomer = order.customer.toString() === req.user._id.toString();
    const isAdmin = ["Admin", "Owner", "Super Admin"].includes(req.user.role);
    const isAssignedDelivery = order.deliveryPartner && order.deliveryPartner.toString() === req.user._id.toString();

    if (!isCustomer && !isAdmin && !isAssignedDelivery) {
      return res.status(403).json({ success: false, message: "Access denied to order messages" });
    }

    const messages = await Message.find({ order: orderId })
      .populate("sender", "name email role")
      .sort("timestamp");

    // Clear unread flags upon reading
    let orderUpdated = false;
    if (isAdmin && order.adminUnread) {
      order.adminUnread = false;
      orderUpdated = true;
    }
    if (isCustomer && order.customerUnread) {
      order.customerUnread = false;
      orderUpdated = true;
    }
    if (orderUpdated) {
      await order.save();
    }

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    next(error);
  }
};

// Send a message for a specific order
export const sendOrderMessage = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Auth check: customer, admin, owner, or assigned delivery partner
    const isCustomer = order.customer.toString() === req.user._id.toString();
    const isAdmin = ["Admin", "Owner", "Super Admin"].includes(req.user.role);
    const isAssignedDelivery = order.deliveryPartner && order.deliveryPartner.toString() === req.user._id.toString();

    if (!isCustomer && !isAdmin && !isAssignedDelivery) {
      return res.status(403).json({ success: false, message: "Access denied to send message" });
    }

    let newMessage = await Message.create({
      order: orderId,
      sender: req.user._id,
      message: message.trim()
    });

    newMessage = await newMessage.populate("sender", "name email role");

    // Toggle unread state based on sender role
    if (req.user.role === "Customer") {
      order.adminUnread = true;
    } else if (["Admin", "Owner", "Super Admin"].includes(req.user.role)) {
      order.customerUnread = true;
    }
    await order.save();

    // Socket.io Real-time broadcast to order chat room
    if (req.io) {
      req.io.to(`order_chat_${orderId}`).emit("newChatMessage", newMessage);
      
      // If customer sent it, notify all admins in admin_room
      if (req.user.role === "Customer") {
        req.io.to("admin_room").emit("customerChatMessage", newMessage);
      }
      // If admin sent it, notify the customer in their private room
      else if (["Admin", "Owner", "Super Admin"].includes(req.user.role)) {
        req.io.to(`user_${order.customer}`).emit("supportChatMessage", newMessage);
      }
    }

    res.status(201).json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    next(error);
  }
};
