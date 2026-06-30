import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  color: String,
  size: String,
  price: { type: Number, required: true } // Price at the time of purchase
}, { _id: false });

const TrackingItemSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Packed", "Shipped", "OutForDelivery", "Delivered", "Cancelled", "Returned", "Replaced"],
    required: true
  },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [OrderItemSchema],
  shippingAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  paymentMethod: {
    type: String,
    enum: ["COD", "Stripe", "Razorpay"],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed", "Refunded"],
    default: "Pending"
  },
  paymentDetails: {
    transactionId: String,
    paymentGatewayOrderId: String,
    signature: String
  },
  orderStatus: {
    type: String,
    enum: ["Pending", "Confirmed", "Packed", "Shipped", "OutForDelivery", "Delivered", "Cancelled", "Returned", "Replaced"],
    default: "Pending"
  },
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  pricing: {
    subtotal: { type: Number, required: true },
    gst: { type: Number, required: true },
    shipping: { type: Number, required: true },
    couponDiscount: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  trackingHistory: [TrackingItemSchema],
  invoiceUrl: { type: String, default: "" },
  cancellationReason: String,
  returnReason: String,
  otpForDelivery: { type: String } // OTP delivery verification
}, { timestamps: true });

// Pre-save to generate order number if not present
OrderSchema.pre("save", function(next) {
  if (!this.orderNumber) {
    this.orderNumber = "ORD-" + Date.now().toString() + Math.floor(1000 + Math.random() * 9000).toString();
  }
  next();
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
