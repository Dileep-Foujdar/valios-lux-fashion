import twilio from "twilio";
import WebsiteSettings from "../models/WebsiteSettings.js";

const getTwilioClient = async () => {
  let sid = process.env.TWILIO_ACCOUNT_SID;
  let token = process.env.TWILIO_AUTH_TOKEN;
  let from = process.env.TWILIO_FROM_NUMBER;

  try {
    const settings = await WebsiteSettings.findOne();
    if (settings && settings.sms && settings.sms.twilioSid && settings.sms.token) {
      sid = settings.sms.twilioSid;
      token = settings.sms.token;
      from = settings.sms.fromNum;
    }
  } catch (err) {
    // Fall back to env variables
  }

  if (!sid || sid === "mock_sid" || !token || !from) {
    return null;
  }

  try {
    return {
      client: twilio(sid, token),
      from
    };
  } catch (err) {
    console.error("Twilio client init error:", err.message);
    return null;
  }
};

export const sendSMS = async ({ to, body }) => {
  try {
    const twilioInstance = await getTwilioClient();

    if (!twilioInstance) {
      console.log(`\n--- [MOCK SMS SENT] ---`);
      console.log(`To: ${to}`);
      console.log(`Body: ${body}`);
      console.log(`-----------------------\n`);
      return { sid: "mock-sms-sid-" + Date.now(), status: "sent" };
    }

    const { client, from } = twilioInstance;
    const message = await client.messages.create({
      body,
      to,
      from
    });

    console.log(`> SMS sent to ${to}: ${message.sid}`);
    return message;
  } catch (error) {
    console.error(`> SMS sending error to ${to}:`, error.message);
    return { error: error.message };
  }
};

// Ready-to-use SMS template helper
export const smsTemplates = {
  otp: (otpCode) => `Your VALOIS verification code is: ${otpCode}. Valid for 5 minutes. Do not share.`,
  orderConfirmed: (orderNumber) => `Your VALOIS order #${orderNumber} is confirmed! We will update you once it's packed and shipped.`,
  orderPacked: (orderNumber) => `Great news! Your VALOIS order #${orderNumber} is packed and ready for shipping.`,
  orderShipped: (orderNumber) => `Your VALOIS order #${orderNumber} has been shipped! Check email for tracking details.`,
  outForDelivery: (orderNumber, otp) => `Your VALOIS order #${orderNumber} is out for delivery! Provide OTP ${otp} to the agent upon delivery.`,
  delivered: (orderNumber) => `Your VALOIS order #${orderNumber} has been successfully delivered! Thank you for shopping with us.`,
  cancelled: (orderNumber) => `Your VALOIS order #${orderNumber} has been cancelled. If paid, your refund will reflect in your wallet shortly.`,
  deliveryAssigned: (orderNumber) => `New VALOIS delivery assignment! Order #${orderNumber} is ready for pickup. Check app.`
};
