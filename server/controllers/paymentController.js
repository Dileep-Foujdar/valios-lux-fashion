import Stripe from "stripe";
import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { sendEmail, emailTemplates } from "../utils/email.js";
import { sendSMS, smsTemplates } from "../utils/sms.js";
import { applyOrderSalesMetrics } from "../utils/productMetrics.js";

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

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (
    !keyId ||
    keyId.includes("mock_key_id") ||
    !keySecret ||
    keySecret.includes("mock_razorpay_secret")
  ) {
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

const assertOrderOwner = (order, userId) => {
  if (!order.customer || order.customer.toString() !== userId.toString()) {
    const err = new Error("Not authorized to pay for this order");
    err.statusCode = 403;
    throw err;
  }
};

// 1. Process Stripe Payment (legacy / optional)
export const processStripePayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate("items.product", "title");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    assertOrderOwner(order, req.user._id);

    const stripe = getStripe();
    const amountInCents = Math.round(order.pricing.total * 100);

    if (!stripe) {
      console.log(`> [MOCK STRIPE] Creating checkout session for Order #${order.orderNumber}`);
      return res.status(200).json({
        success: true,
        mode: "mock",
        url: `/checkout/success?gateway=stripe&orderId=${order._id}&session_id=mock_stripe_session_${Date.now()}`
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `Zentro Order #${order.orderNumber}`,
              description: order.items.map((i) => i.product.title).join(", ")
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

// 2. Create Razorpay order for checkout
export const processRazorpayPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    assertOrderOwner(order, req.user._id);

    if (order.paymentStatus === "Paid") {
      return res.status(400).json({ success: false, message: "Order is already paid" });
    }

    if (order.paymentMethod !== "Razorpay") {
      return res.status(400).json({
        success: false,
        message: "This order is not set for Razorpay payment"
      });
    }

    const amountInPaise = Math.round(Number(order.pricing?.total || 0) * 100);
    if (!amountInPaise || amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount for Razorpay"
      });
    }

    const rzp = getRazorpay();

    // Dev fallback when live keys are not configured
    if (!rzp) {
      console.log(`> [MOCK RAZORPAY] Creating order for #${order.orderNumber}`);
      const mockRzpOrderId = `order_mock_${Date.now()}`;

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
        internalOrderId: order._id,
        orderNumber: order.orderNumber,
        message: "Razorpay keys are mock/missing. Using mock checkout. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for live payments."
      });
    }

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: String(order.orderNumber).slice(0, 40),
      notes: {
        internalOrderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerId: req.user._id.toString()
      },
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
      internalOrderId: order._id,
      orderNumber: order.orderNumber
    });
  } catch (error) {
    next(error);
  }
};

// 3. Verify payment (Razorpay signature / Stripe session)
export const verifyPayment = async (req, res, next) => {
  try {
    const {
      gateway,
      orderId,
      stripeSessionId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature
    } = req.body;

    const order = await Order.findById(orderId).populate("items.product", "title");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    assertOrderOwner(order, req.user._id);

    if (order.paymentStatus === "Paid") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        order
      });
    }

    let isSuccess = false;
    let paymentDetails = order.paymentDetails || {};

    if (gateway === "stripe") {
      const stripe = getStripe();
      if (!stripe) {
        if (stripeSessionId && stripeSessionId.startsWith("mock_stripe")) {
          isSuccess = true;
          paymentDetails = { transactionId: stripeSessionId };
        }
      } else {
        const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
        if (session.payment_status === "paid") {
          isSuccess = true;
          paymentDetails = {
            transactionId: session.payment_intent
              ? session.payment_intent.toString()
              : stripeSessionId
          };
        }
      }
    } else if (gateway === "razorpay") {
      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        return res.status(400).json({
          success: false,
          message: "Missing Razorpay payment verification fields"
        });
      }

      // Ensure client is verifying against the order we created
      if (
        order.paymentDetails?.paymentGatewayOrderId &&
        order.paymentDetails.paymentGatewayOrderId !== razorpayOrderId
      ) {
        return res.status(400).json({
          success: false,
          message: "Razorpay order mismatch"
        });
      }

      const rzp = getRazorpay();
      if (!rzp) {
        if (String(razorpayOrderId).startsWith("order_mock_")) {
          isSuccess = true;
          paymentDetails = {
            transactionId: razorpayPaymentId,
            paymentGatewayOrderId: razorpayOrderId,
            signature: razorpaySignature || "mock_signature"
          };
        }
      } else {
        const text = `${razorpayOrderId}|${razorpayPaymentId}`;
        const generatedSignature = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
          .update(text)
          .digest("hex");

        if (generatedSignature === razorpaySignature) {
          isSuccess = true;
          paymentDetails = {
            transactionId: razorpayPaymentId,
            paymentGatewayOrderId: razorpayOrderId,
            signature: razorpaySignature
          };
        }
      }
    } else {
      return res.status(400).json({ success: false, message: "Unsupported payment gateway" });
    }

    if (isSuccess) {
      const confirmMessage =
        gateway === "razorpay"
          ? "Payment received via Razorpay. Order confirmed."
          : "Payment received. Order confirmed.";

      const wasUnpaid = order.paymentStatus !== "Paid";
      order.paymentStatus = "Paid";
      order.orderStatus = "Confirmed";
      order.paymentDetails = paymentDetails;
      order.trackingHistory.push({
        status: "Confirmed",
        message: confirmMessage
      });
      await order.save();

      if (wasUnpaid) {
        await applyOrderSalesMetrics(order).catch(() => {});
      }

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

    order.paymentStatus = "Failed";
    await order.save();

    res.status(400).json({
      success: false,
      message: "Payment verification failed"
    });
  } catch (error) {
    next(error);
  }
};
