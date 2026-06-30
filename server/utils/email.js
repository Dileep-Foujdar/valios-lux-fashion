import nodemailer from "nodemailer";
import WebsiteSettings from "../models/WebsiteSettings.js";

// Helper to get transporter dynamically from environment or Database settings
const getTransporter = async () => {
  let host = process.env.SMTP_HOST;
  let port = parseInt(process.env.SMTP_PORT || "587");
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;

  try {
    const settings = await WebsiteSettings.findOne();
    if (settings && settings.smtp && settings.smtp.host && settings.smtp.user) {
      host = settings.smtp.host;
      port = settings.smtp.port;
      user = settings.smtp.user;
      pass = settings.smtp.pass;
    }
  } catch (err) {
    // Fall back to env variables if DB query fails
  }

  if (!host || !user) {
    // If not configured, return null for mock mode
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass
    }
  });
};

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = await getTransporter();
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@fashionstore.com";

    if (!transporter) {
      console.log(`\n--- [MOCK EMAIL SENT] ---`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content (Text): ${text || "HTML only"}`);
      console.log(`-------------------------\n`);
      return { messageId: "mock-id-" + Date.now() };
    }

    const info = await transporter.sendMail({
      from: `"VALOIS Lux Fashion" <${fromEmail}>`,
      to,
      subject,
      text: text || "Please enable HTML view to read this mail.",
      html
    });

    console.log(`> Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`> Email sending error to ${to}:`, error.message);
    // Return dummy data instead of crashing in mock/dev mode
    return { error: error.message };
  }
};

// Ready-to-use premium HTML templates
export const emailTemplates = {
  otp: (otpCode) => `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.05em; margin: 0; color: #0f172a; text-transform: uppercase;">VALOIS</h1>
        <p style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 5px;">Luxury E-Commerce</p>
      </div>
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 30px;">
        <p style="font-size: 16px; color: #475569; margin-top: 0;">Use the following verification code to access your account:</p>
        <h2 style="font-size: 42px; font-weight: 800; letter-spacing: 0.25em; margin: 20px 0; color: #0f172a;">${otpCode}</h2>
        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0;">This code is valid for 5 minutes. Do not share this OTP with anyone.</p>
      </div>
      <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 0;">If you didn't request this code, you can safely ignore this email. Someone may have entered your address by mistake.</p>
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
      <div style="text-align: center; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0 0 5px 0;">&copy; ${new Date().getFullYear()} VALOIS Lux. All rights reserved.</p>
        <p style="margin: 0;">123 Fashion Street, Mumbai, Maharashtra, India</p>
      </div>
    </div>
  `,

  orderConfirmation: (order) => `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.05em; margin: 0; color: #0f172a; text-transform: uppercase;">VALOIS</h1>
        <p style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 5px;">Order Confirmed</p>
      </div>
      <p style="font-size: 16px; color: #334155; margin-top: 0; line-height: 1.6;">Dear <strong>${order.shippingAddress.name}</strong>,</p>
      <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-top: 0;">Thank you for shopping at VALOIS! We are pleased to confirm that your order <strong>#${order.orderNumber}</strong> has been received and is being processed.</p>
      
      <div style="border: 1px solid #f1f5f9; border-radius: 8px; padding: 20px; margin: 25px 0; background-color: #fafbfc;">
        <h3 style="font-size: 14px; text-transform: uppercase; color: #0f172a; margin-top: 0; margin-bottom: 15px; letter-spacing: 0.05em;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="border-bottom: 1px solid #e2e8f0; text-align: left; color: #64748b;">
              <th style="padding-bottom: 8px;">Item</th>
              <th style="padding-bottom: 8px; text-align: center;">Qty</th>
              <th style="padding-bottom: 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr style="border-bottom: 1px solid #f1f5f9; color: #334155;">
                <td style="padding: 10px 0;">
                  <div style="font-weight: 600; color: #0f172a;">${item.product.title || "Fashion Item"}</div>
                  <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Size: ${item.size || "Standard"} | Color: ${item.color || "Default"}</div>
                </td>
                <td style="padding: 10px 0; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600;">₹${item.price}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        
        <div style="margin-top: 15px; text-align: right; font-size: 14px; color: #475569;">
          <div style="margin-bottom: 5px;">Subtotal: ₹${order.pricing.subtotal}</div>
          <div style="margin-bottom: 5px;">GST (18%): ₹${order.pricing.gst}</div>
          <div style="margin-bottom: 5px;">Shipping: ₹${order.pricing.shipping}</div>
          ${order.pricing.couponDiscount > 0 ? `<div style="margin-bottom: 5px; color: #16a34a;">Discount: -₹${order.pricing.couponDiscount}</div>` : ""}
          <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 10px;">Total Amount: ₹${order.pricing.total}</div>
        </div>
      </div>
      
      <div style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 30px;">
        <h4 style="margin: 0 0 5px 0; color: #0f172a;">Shipping Address:</h4>
        <p style="margin: 0;">${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.zipCode}</p>
        <p style="margin: 5px 0 0 0;">Phone: ${order.shippingAddress.phone}</p>
      </div>

      <div style="text-align: center; margin: 35px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/profile" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Track Your Order</a>
      </div>
      
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
      <div style="text-align: center; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0 0 5px 0;">&copy; ${new Date().getFullYear()} VALOIS Lux. All rights reserved.</p>
      </div>
    </div>
  `,

  deliveryAssignment: (order, partner) => `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.05em; margin: 0; color: #0f172a; text-transform: uppercase;">VALOIS</h1>
        <p style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 5px;">Delivery Assignment</p>
      </div>
      <p style="font-size: 16px; color: #334155; margin-top: 0; line-height: 1.6;">Hello <strong>${partner.name}</strong>,</p>
      <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-top: 0;">You have been assigned a new delivery task. Please find the details below:</p>
      
      <div style="border: 1px solid #f1f5f9; border-radius: 8px; padding: 20px; margin: 25px 0; background-color: #fafbfc; font-size: 14px;">
        <p style="margin: 0 0 10px 0;"><strong>Order ID:</strong> #${order.orderNumber}</p>
        <p style="margin: 0 0 10px 0;"><strong>Customer Name:</strong> ${order.shippingAddress.name}</p>
        <p style="margin: 0 0 10px 0;"><strong>Delivery Address:</strong> ${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.zipCode}</p>
        <p style="margin: 0 0 10px 0;"><strong>Customer Phone:</strong> ${order.shippingAddress.phone}</p>
        <p style="margin: 0 0 10px 0;"><strong>Payment Type:</strong> ${order.paymentMethod} (${order.paymentStatus === 'Paid' ? 'Paid' : 'Collect cash ₹' + order.pricing.total})</p>
      </div>

      <div style="text-align: center; margin: 35px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/delivery" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Accept & Navigate</a>
      </div>
      
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
      <div style="text-align: center; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0 0 5px 0;">&copy; ${new Date().getFullYear()} VALOIS Lux. All rights reserved.</p>
      </div>
    </div>
  `
};
