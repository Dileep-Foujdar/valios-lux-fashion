import Stripe from "stripe";
import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { sendEmail, emailTemplates } from "../utils/email.js";
import { sendSMS, smsTemplates } from "../utils/sms.js";

// Initialize Stripe if keys are valid
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("mock_stripe")) {
    return null;
  }
  try {
    return new Stripe(key);
  } catch (err) {
    console.error("Stripe initialization failed:", err.message);
    return null;
  }
};

// Initialize Razorpay if keys are valid
const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || keyId.includes("mock_key_id") || !keySecret || keySecret.includes("mock_razorpay_secret")) {
    return null;
  }
  try {
    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  } catch (err) {
    console.error("Razorpay initialization failed:", err.message);
    return null;
  }
};

// 1. Process Stripe Payment
export const processStripePayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate("items.product", "title");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const stripe = getStripe();
    const amountInCents = Math.round(order.pricing.total * 100);

    // If Stripe is mock, return a successful mock checkout payload
    if (!stripe) {
      console.log(`> [MOCK STRIPE] Creating checkout session for Order #${order.orderNumber}`);
      return res.status(200).json({
        success: true,
        mode: "mock",
        url: `/checkout/success?gateway=stripe&orderId=${order._id}&session_id=mock_stripe_session_${Date.now()}`
      });
    }

    // Live Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `VALOIS Fashion Order #${order.orderNumber}`,
              description: order.items.map(i => i.product.title).join(", ")
            },
            unit_amount: amountInCents
          },
          quantity: 1
        }
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL || "http://localhost:5000"}/checkout/success?gateway=stripe&orderId=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5000"}/checkout/cancel?orderId=${order._id}`,
      metadata: { orderId: order._id.toString() }
    });

    res.status(200).json({
      success: true,
      mode: "live",
      url: session.url
    });
  } catch (error) {
    next(error);
  }
};

// 2. Process Razorpay Payment (Create Order)
export const processRazorpayPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const rzp = getRazorpay();
    const amountInPaise = Math.round(order.pricing.total * 100);

    // If Razorpay is mock
    if (!rzp) {
      console.log(`> [MOCK RAZORPAY] Creating order object for Order #${order.orderNumber}`);
      const mockRzpOrderId = `mock_rzp_order_${Date.now()}`;
      
      order.paymentDetails = {
        paymentGatewayOrderId: mockRzpOrderId
      };
      await order.save();

      return res.status(200).json({
        success: true,
        mode: "mock",
        keyId: "rzp_test_mock_key_id",
        amount: amountInPaise,
        currency: "INR",
        orderId: mockRzpOrderId,
        internalOrderId: order._id
      });
    }

    // Live Razorpay order
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: order.orderNumber,
      payment_capture: 1
    };

    const rzpOrder = await rzp.orders.create(options);

    order.paymentDetails = {
      paymentGatewayOrderId: rzpOrder.id
    };
    await order.save();

    res.status(200).json({
      success: true,
      mode: "live",
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      orderId: rzpOrder.id,
      internalOrderId: order._id
    });
  } catch (error) {
    next(error);
  }
};

// 3. Verify Payment Signature (Webhook / Client confirm)
export const verifyPayment = async (req, res, next) => {
  try {
    const { gateway, orderId, stripeSessionId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    const order = await Order.findById(orderId).populate("items.product", "title");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    let isSuccess = false;

    if (gateway === "stripe") {
      // For Stripe, verify session status
      const stripe = getStripe();
      if (!stripe) {
        // Mock verification
        if (stripeSessionId && stripeSessionId.startsWith("mock_stripe")) {
          isSuccess = true;
          order.paymentDetails = { transactionId: stripeSessionId };
        }
      } else {
        const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
        if (session.payment_status === "paid") {
          isSuccess = true;
          order.paymentDetails = {
            transactionId: session.payment_intent ? session.payment_intent.toString() : stripeSessionId
          };
        }
      }
    } else if (gateway === "razorpay") {
      const rzp = getRazorpay();
      if (!rzp) {
        // Mock verification
        if (razorpayPaymentId && razorpayOrderId) {
          isSuccess = true;
          order.paymentDetails = {
            transactionId: razorpayPaymentId,
            paymentGatewayOrderId: razorpayOrderId,
            signature: razorpaySignature || "mock_signature"
          };
        }
      } else {
        // Live HMAC verification
        const text = razorpayOrderId + "|" + razorpayPaymentId;
        const generated_signature = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
          .update(text)
          .digest("hex");

        if (generated_signature === razorpaySignature) {
          isSuccess = true;
          order.paymentDetails = {
            transactionId: razorpayPaymentId,
            paymentGatewayOrderId: razorpayOrderId,
            signature: razorpaySignature
          };
        }
      }
    }

    if (isSuccess) {
      order.paymentStatus = "Paid";
      order.orderStatus = "Confirmed";
      order.trackingHistory.push({
        status: "Confirmed",
        message: "Payment received. Order confirmed."
      });
      await order.save();

      // Send Confirmation Alerts
      const customer = await User.findById(order.customer);
      if (customer) {
        await sendEmail({
          to: customer.email,
          subject: `Order Confirmed: #${order.orderNumber}`,
          html: emailTemplates.orderConfirmation(order),
          text: `Your order #${order.orderNumber} is confirmed! Payment received.`
        });
        await sendSMS({
          to: customer.mobile,
          body: smsTemplates.orderConfirmed(order.orderNumber)
        });
      }

      // Notify Socket.io
      if (req.io) {
        req.io.emit("newOrder", {
          orderNumber: order.orderNumber,
          customer: customer ? customer.name : "Customer",
          total: order.pricing.total
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        order
      });
    }

    res.status(400).json({
      success: false,
      message: "Payment verification failed"
    });
  } catch (error) {
    next(error);
  }
};
