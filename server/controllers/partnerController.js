import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OTP from "../models/OTP.js";
import DeliveryPartner from "../models/DeliveryPartner.js";
import DeliveryAssignment from "../models/DeliveryAssignment.js";
import Order from "../models/Order.js";
import { sendEmail, emailTemplates } from "../utils/email.js";
import { sendSMS, smsTemplates } from "../utils/sms.js";
import {
  encryptSensitive,
  decryptSensitive,
  maskAadhaar,
  maskAccount,
  hashOtp,
  normalizeIndianMobile,
  isValidIndianMobile
} from "../utils/cryptoSensitive.js";
import { createPresignedUpload, isS3Configured } from "../config/s3.js";

const signTokens = (userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
  return { token, refreshToken };
};

const publicPartner = (partner, { reveal = false } = {}) => {
  if (!partner) return null;
  const obj = partner.toObject ? partner.toObject() : { ...partner };
  const aadhaarPlain = reveal ? decryptSensitive(obj.aadhaarEncrypted) : "";
  const accountPlain = reveal ? decryptSensitive(obj.bank?.accountNumberEncrypted) : "";
  delete obj.aadhaarEncrypted;
  const bank = obj.bank || {};
  delete bank.accountNumberEncrypted;
  return {
    ...obj,
    aadhaarMasked: maskAadhaar(obj.aadhaarLast4 ? `XXXXXXXX${obj.aadhaarLast4}` : aadhaarPlain),
    aadhaar: reveal ? aadhaarPlain : undefined,
    bank: {
      accountHolderName: bank.accountHolderName || "",
      ifsc: bank.ifsc || "",
      bankName: bank.bankName || "",
      verification: bank.verification || "pending",
      accountMasked: maskAccount(bank.accountLast4 ? `XXXX${bank.accountLast4}` : accountPlain),
      accountNumber: reveal ? accountPlain : undefined,
      accountLast4: bank.accountLast4 || ""
    }
  };
};

const createPartnerOtp = async ({ destination, purpose }) => {
  const code = String(crypto.randomInt(100000, 999999));
  const codeHashed = hashOtp(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await OTP.deleteMany({ destination, purpose });
  await OTP.create({
    destination,
    purpose,
    code: codeHashed,
    codeHash: codeHashed,
    expiresAt
  });

  await sendEmail({
    to: destination,
    subject: purpose === "delivery_register"
      ? "Verify your delivery partner email"
      : "Delivery partner login OTP",
    html: emailTemplates.otp(code)
  });
};

export const requestPartnerOtp = async (req, res, next) => {
  try {
    const { email, purpose: rawPurpose } = req.body;
    const purpose = rawPurpose === "delivery_register" ? "delivery_register" : "delivery_login";
    const destination = String(email || "").toLowerCase().trim();
    if (!destination || !destination.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }

    if (purpose === "delivery_login") {
      const user = await User.findOne({ email: destination, role: "Delivery Partner" });
      if (!user || !user.isActive) {
        return res.status(404).json({ success: false, message: "No delivery partner account found for this email" });
      }
    }

    if (purpose === "delivery_register") {
      const existing = await User.findOne({ email: destination });
      if (existing && existing.role !== "Delivery Partner") {
        return res.status(400).json({
          success: false,
          message: "This email is already registered as a customer. Use a different email for delivery partner signup."
        });
      }
    }

    await createPartnerOtp({ destination, purpose });
    res.status(200).json({
      success: true,
      message: "OTP sent to your email. Check your inbox.",
      purpose
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPartnerOtp = async (req, res, next) => {
  try {
    const { email, otp, purpose: rawPurpose } = req.body;
    const purpose = rawPurpose === "delivery_register" ? "delivery_register" : "delivery_login";
    const destination = String(email || "").toLowerCase().trim();
    const code = String(otp || "").trim();

    const otpRecord = await OTP.findOne({ destination, purpose, isUsed: false }).sort("-createdAt");
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "OTP not found. Request a new one." });
    }
    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }
    if (otpRecord.attempts >= 5) {
      return res.status(429).json({ success: false, message: "Too many attempts. Request a new OTP." });
    }

    const hashed = hashOtp(code);
    if (otpRecord.code !== hashed && otpRecord.codeHash !== hashed) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    otpRecord.isUsed = true;
    otpRecord.verified = true;
    await otpRecord.save();

    if (purpose === "delivery_login") {
      const user = await User.findOne({ email: destination, role: "Delivery Partner" });
      if (!user) {
        return res.status(404).json({ success: false, message: "Partner account not found" });
      }
      const partner = await DeliveryPartner.findOne({ user: user._id });
      const { token, refreshToken } = signTokens(user._id);
      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        refreshToken,
        user,
        partner: publicPartner(partner)
      });
    }

    // Register flow — mark email verified session token (short-lived JWT claim)
    const registrationToken = jwt.sign(
      { email: destination, purpose: "delivery_register_verified" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.status(200).json({
      success: true,
      message: "Email verified. Continue registration.",
      registrationToken,
      email: destination
    });
  } catch (error) {
    next(error);
  }
};

export const registerPartner = async (req, res, next) => {
  try {
    const {
      registrationToken,
      fullName,
      dateOfBirth,
      age,
      mobile,
      currentAddress,
      aadhaarNumber,
      aadhaarDocumentUrl,
      selfieUrl,
      vehicleNumber,
      vehicleDetails,
      bank,
      location
    } = req.body;

    let email;
    try {
      const decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
      if (decoded.purpose !== "delivery_register_verified") throw new Error("bad token");
      email = decoded.email;
    } catch {
      return res.status(401).json({ success: false, message: "Email verification expired. Verify OTP again." });
    }

    const normalizedMobile = normalizeIndianMobile(mobile);
    if (!isValidIndianMobile(normalizedMobile)) {
      return res.status(400).json({ success: false, message: "Valid mobile number is required" });
    }
    if (!fullName?.trim() || !vehicleNumber?.trim()) {
      return res.status(400).json({ success: false, message: "Name and vehicle number are required" });
    }
    if (!aadhaarNumber || String(aadhaarNumber).replace(/\D/g, "").length !== 12) {
      return res.status(400).json({ success: false, message: "Valid 12-digit Aadhaar is required" });
    }
    if (!selfieUrl) {
      return res.status(400).json({ success: false, message: "Live selfie is required" });
    }
    if (!bank?.accountNumber || !bank?.ifsc || !bank?.accountHolderName) {
      return res.status(400).json({ success: false, message: "Bank account details are required" });
    }

    let user = await User.findOne({ email });
    if (user && user.role !== "Delivery Partner") {
      return res.status(400).json({ success: false, message: "Email already used by another account type" });
    }

    if (!user) {
      user = await User.create({
        name: fullName.trim(),
        email,
        mobile: normalizedMobile,
        role: "Delivery Partner",
        permissionsOnboardingCompleted: true,
        isActive: true
      });
    } else {
      user.name = fullName.trim();
      user.mobile = normalizedMobile;
      user.role = "Delivery Partner";
      user.isActive = true;
      await user.save();
    }

    const aadhaarDigits = String(aadhaarNumber).replace(/\D/g, "");
    const accountDigits = String(bank.accountNumber).replace(/\D/g, "");

    let partner = await DeliveryPartner.findOne({ user: user._id });
    const payload = {
      user: user._id,
      fullName: fullName.trim(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      age: age ? Number(age) : undefined,
      mobile: normalizedMobile,
      email,
      emailVerified: true,
      currentAddress: currentAddress || {},
      location: {
        latitude: location?.latitude,
        longitude: location?.longitude,
        accuracy: location?.accuracy,
        updatedAt: new Date(),
        trackingConsent: Boolean(location?.trackingConsent)
      },
      aadhaarEncrypted: encryptSensitive(aadhaarDigits),
      aadhaarLast4: aadhaarDigits.slice(-4),
      aadhaarDocumentUrl: aadhaarDocumentUrl || "",
      aadhaarVerification: "under_review",
      selfieUrl,
      selfieVerification: "under_review",
      selfieCapturedAt: new Date(),
      vehicleNumber: String(vehicleNumber).toUpperCase().trim(),
      vehicleDetails: vehicleDetails || "",
      bank: {
        accountHolderName: bank.accountHolderName,
        accountNumberEncrypted: encryptSensitive(accountDigits),
        accountLast4: accountDigits.slice(-4),
        ifsc: String(bank.ifsc).toUpperCase().trim(),
        bankName: bank.bankName || "",
        verification: "under_review"
      },
      approvalStatus: "pending"
    };

    if (partner) {
      Object.assign(partner, payload);
      await partner.save();
    } else {
      partner = await DeliveryPartner.create(payload);
    }

    const { token, refreshToken } = signTokens(user._id);
    res.status(201).json({
      success: true,
      message: "Application submitted. Await admin approval.",
      token,
      refreshToken,
      user,
      partner: publicPartner(partner)
    });
  } catch (error) {
    next(error);
  }
};

export const getPartnerMe = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ user: req.user._id });
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner profile not found" });
    }
    res.status(200).json({ success: true, partner: publicPartner(partner) });
  } catch (error) {
    next(error);
  }
};

export const updatePartnerProfile = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ user: req.user._id });
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner profile not found" });
    }

    const { fullName, mobile, currentAddress, vehicleNumber, vehicleDetails, profilePhoto, bank, location, isOnline, isAvailable } = req.body;

    if (fullName) partner.fullName = fullName.trim();
    if (mobile) {
      const m = normalizeIndianMobile(mobile);
      if (!isValidIndianMobile(m)) {
        return res.status(400).json({ success: false, message: "Invalid mobile" });
      }
      partner.mobile = m;
      await User.findByIdAndUpdate(req.user._id, { mobile: m, name: partner.fullName });
    }
    if (currentAddress) partner.currentAddress = { ...partner.currentAddress, ...currentAddress };
    if (vehicleNumber) partner.vehicleNumber = String(vehicleNumber).toUpperCase().trim();
    if (vehicleDetails !== undefined) partner.vehicleDetails = vehicleDetails;
    if (profilePhoto) partner.profilePhoto = profilePhoto;
    if (typeof isOnline === "boolean") partner.isOnline = isOnline;
    if (typeof isAvailable === "boolean") partner.isAvailable = isAvailable;

    if (!partner.bank) partner.bank = {};
    if (bank?.accountNumber) {
      const accountDigits = String(bank.accountNumber).replace(/\D/g, "");
      partner.bank.accountNumberEncrypted = encryptSensitive(accountDigits);
      partner.bank.accountLast4 = accountDigits.slice(-4);
      partner.bank.verification = "pending";
    }
    if (bank?.accountHolderName) partner.bank.accountHolderName = bank.accountHolderName;
    if (bank?.ifsc) partner.bank.ifsc = String(bank.ifsc).toUpperCase().trim();
    if (bank?.bankName) partner.bank.bankName = bank.bankName;

    if (location?.latitude != null) {
      partner.location = {
        ...partner.location,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        accuracy: location.accuracy,
        updatedAt: new Date(),
        trackingConsent: Boolean(location.trackingConsent ?? partner.location?.trackingConsent)
      };
    }

    // Identity fields locked after verification — request re-review only via admin
    await partner.save();
    res.status(200).json({ success: true, partner: publicPartner(partner) });
  } catch (error) {
    next(error);
  }
};

export const partnerPresign = async (req, res, next) => {
  try {
    if (!isS3Configured()) {
      return res.status(503).json({ success: false, message: "Uploads not configured" });
    }
    const { fileName, contentType, kind } = req.body;
    if (!String(contentType || "").startsWith("image/")) {
      return res.status(400).json({ success: false, message: "Only images allowed" });
    }
    const folder = kind === "aadhaar" ? "delivery-kyc/aadhaar" : "delivery-kyc/selfie";
    const result = await createPresignedUpload({ fileName, contentType, folder });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ user: req.user._id });
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner profile not found" });
    }

    const partnerId = partner._id;
    const all = await DeliveryAssignment.find({
      $or: [{ acceptedBy: partnerId }, { offeredTo: partnerId }]
    });

    const mine = all.filter((a) => a.acceptedBy?.toString() === partnerId.toString());
    const countBy = (status) => mine.filter((a) => a.status === status).length;
    const completed = mine.filter((a) => a.status === "delivered");
    const sumFees = (list) => list.reduce((s, a) => s + (Number(a.deliveryFee) || 0), 0);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

    const deliveredIn = (since) =>
      completed.filter((a) => a.deliveredAt && new Date(a.deliveredAt) >= since);

    res.status(200).json({
      success: true,
      partner: publicPartner(partner),
      stats: {
        totalDeliveries: mine.length,
        pendingDeliveries: countBy("accepted") + countBy("picked_up"),
        acceptedDeliveries: countBy("accepted"),
        completedDeliveries: countBy("delivered"),
        rejectedDeliveries: all.filter((a) =>
          a.rejectedBy?.some((r) => r.partner?.toString() === partnerId.toString())
        ).length,
        cancelledDeliveries: countBy("cancelled"),
        totalEarnings: sumFees(completed),
        todayEarnings: sumFees(deliveredIn(startOfDay)),
        weekEarnings: sumFees(deliveredIn(startOfWeek)),
        monthEarnings: sumFees(deliveredIn(startOfMonth)),
        availableOffers: await DeliveryAssignment.countDocuments({
          status: "available",
          offeredTo: partnerId,
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
        })
      }
    });
  } catch (error) {
    next(error);
  }
};

export const listOffers = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ user: req.user._id });
    if (!partner || partner.approvalStatus !== "approved") {
      return res.status(403).json({ success: false, message: "Partner not approved" });
    }

    const offers = await DeliveryAssignment.find({
      status: "available",
      offeredTo: partner._id,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    })
      .populate({
        path: "order",
        select: "orderNumber shippingAddress pricing items orderStatus createdAt",
        populate: { path: "items.product", select: "title images" }
      })
      .sort("-createdAt");

    res.status(200).json({ success: true, offers });
  } catch (error) {
    next(error);
  }
};

export const listMyAssignments = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ user: req.user._id });
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    const assignments = await DeliveryAssignment.find({ acceptedBy: partner._id })
      .populate({
        path: "order",
        populate: [
          { path: "customer", select: "name mobile email" },
          { path: "items.product", select: "title images brand salePrice" }
        ]
      })
      .sort("-updatedAt");

    res.status(200).json({ success: true, assignments });
  } catch (error) {
    next(error);
  }
};

export const acceptAssignment = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ user: req.user._id });
    if (!partner || partner.approvalStatus !== "approved") {
      return res.status(403).json({ success: false, message: "Not eligible" });
    }

    const assignment = await DeliveryAssignment.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "available",
        acceptedBy: null,
        offeredTo: partner._id,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
      },
      {
        $set: {
          status: "accepted",
          acceptedBy: partner._id,
          acceptedAt: new Date()
        },
        $push: {
          history: {
            previousStatus: "available",
            newStatus: "accepted",
            by: req.user._id,
            partner: partner._id,
            note: "Partner accepted delivery"
          }
        }
      },
      { new: true }
    ).populate("order");

    if (!assignment) {
      return res.status(409).json({
        success: false,
        message: "This delivery is no longer available"
      });
    }

    const order = await Order.findById(assignment.order._id || assignment.order);
    if (order) {
      order.deliveryPartner = req.user._id;
      order.deliveryAssignment = assignment._id;
      order.deliveryFee = assignment.deliveryFee;
      if (["Confirmed", "Packed"].includes(order.orderStatus)) {
        order.orderStatus = "Shipped";
        order.trackingHistory.push({
          status: "Shipped",
          message: "Delivery partner accepted the job"
        });
      }
      await order.save();
    }

    partner.isAvailable = false;
    await partner.save();

    res.status(200).json({ success: true, message: "Delivery accepted", assignment });
  } catch (error) {
    next(error);
  }
};

export const rejectAssignment = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findOne({ user: req.user._id });
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    const assignment = await DeliveryAssignment.findById(req.params.id);
    if (!assignment || assignment.status !== "available") {
      return res.status(400).json({ success: false, message: "Offer not available" });
    }
    if (!assignment.offeredTo.some((id) => id.toString() === partner._id.toString())) {
      return res.status(403).json({ success: false, message: "Not offered to you" });
    }

    assignment.rejectedBy.push({
      partner: partner._id,
      reason: req.body.reason || "",
      at: new Date()
    });
    assignment.offeredTo = assignment.offeredTo.filter(
      (id) => id.toString() !== partner._id.toString()
    );
    assignment.history.push({
      previousStatus: "available",
      newStatus: "available",
      by: req.user._id,
      partner: partner._id,
      note: `Rejected: ${req.body.reason || "No reason"}`
    });

    if (assignment.offeredTo.length === 0) {
      assignment.status = "expired";
      assignment.history.push({
        previousStatus: "available",
        newStatus: "expired",
        note: "All partners rejected or removed"
      });
    }

    await assignment.save();
    res.status(200).json({ success: true, message: "Offer rejected", assignment });
  } catch (error) {
    next(error);
  }
};

export const updateAssignmentStatus = async (req, res, next) => {
  try {
    const { status, otp } = req.body;
    const allowed = ["picked_up", "out_for_delivery", "delivered", "failed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const partner = await DeliveryPartner.findOne({ user: req.user._id });
    const assignment = await DeliveryAssignment.findById(req.params.id);
    if (!partner || !assignment || assignment.acceptedBy?.toString() !== partner._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const prev = assignment.status;
    const order = await Order.findById(assignment.order).populate("customer", "name mobile email");

    if (status === "picked_up") {
      assignment.status = "picked_up";
      assignment.pickedUpAt = new Date();
      if (order) {
        order.orderStatus = "Shipped";
        order.trackingHistory.push({ status: "Shipped", message: "Package picked up" });
      }
    } else if (status === "out_for_delivery") {
      assignment.status = "out_for_delivery";
      assignment.outForDeliveryAt = new Date();
      if (order) {
        const deliveryOtp = String(crypto.randomInt(100000, 999999));
        order.otpForDelivery = deliveryOtp;
        order.orderStatus = "OutForDelivery";
        order.trackingHistory.push({
          status: "OutForDelivery",
          message: "Out for delivery. Share OTP with partner on arrival."
        });
        if (order.customer?.mobile) {
          await sendSMS(
            order.customer.mobile,
            smsTemplates.outForDelivery?.(order.orderNumber, deliveryOtp) || `Delivery OTP: ${deliveryOtp}`
          );
        }
        if (order.customer?.email) {
          await sendEmail({
            to: order.customer.email,
            subject: `Out for delivery — ${order.orderNumber}`,
            html: emailTemplates.orderStatusUpdate?.(order, "OutForDelivery", deliveryOtp) || `<p>OTP: ${deliveryOtp}</p>`
          });
        }
      }
    } else if (status === "delivered") {
      if (!order || order.orderStatus !== "OutForDelivery") {
        return res.status(400).json({ success: false, message: "Mark out for delivery first" });
      }
      if (String(order.otpForDelivery) !== String(otp || "")) {
        return res.status(400).json({ success: false, message: "Invalid delivery OTP" });
      }
      assignment.status = "delivered";
      assignment.deliveredAt = new Date();
      order.orderStatus = "Delivered";
      order.otpForDelivery = undefined;
      if (order.paymentMethod === "COD") order.paymentStatus = "Paid";
      order.trackingHistory.push({ status: "Delivered", message: "Delivered successfully" });
      partner.isAvailable = true;
      await partner.save();
    } else if (status === "failed") {
      assignment.status = "failed";
      if (order) {
        order.trackingHistory.push({
          status: order.orderStatus,
          message: `Delivery failed: ${req.body.note || "No reason"}`
        });
      }
      partner.isAvailable = true;
      await partner.save();
    }

    assignment.history.push({
      previousStatus: prev,
      newStatus: assignment.status,
      by: req.user._id,
      partner: partner._id,
      note: req.body.note || ""
    });

    await assignment.save();
    if (order) await order.save();

    res.status(200).json({ success: true, assignment, order });
  } catch (error) {
    next(error);
  }
};

// —— Admin ——
export const adminListPartners = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.approvalStatus = status;
    if (search) {
      filter.$or = [
        { fullName: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { mobile: new RegExp(search, "i") },
        { vehicleNumber: new RegExp(search, "i") }
      ];
    }
    const partners = await DeliveryPartner.find(filter).sort("-createdAt").populate("user", "name email isActive");
    res.status(200).json({
      success: true,
      partners: partners.map((p) => publicPartner(p, { reveal: false }))
    });
  } catch (error) {
    next(error);
  }
};

export const adminGetPartner = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findById(req.params.id).populate("user", "name email isActive createdAt");
    if (!partner) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.status(200).json({ success: true, partner: publicPartner(partner, { reveal: true }) });
  } catch (error) {
    next(error);
  }
};

export const adminUpdatePartnerStatus = async (req, res, next) => {
  try {
    const { action, reason, aadhaarVerification, selfieVerification, bankVerification } = req.body;
    const partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (action === "approve") {
      partner.approvalStatus = "approved";
      partner.approvedAt = new Date();
      partner.approvedBy = req.user._id;
      partner.aadhaarVerification = aadhaarVerification || "verified";
      partner.selfieVerification = selfieVerification || "verified";
      partner.bank.verification = bankVerification || "verified";
      partner.rejectionReason = "";
      await User.findByIdAndUpdate(partner.user, { isActive: true, role: "Delivery Partner" });
    } else if (action === "reject") {
      partner.approvalStatus = "rejected";
      partner.rejectionReason = reason || "Rejected by admin";
      if (aadhaarVerification) partner.aadhaarVerification = aadhaarVerification;
      if (selfieVerification) partner.selfieVerification = selfieVerification;
    } else if (action === "suspend") {
      partner.approvalStatus = "suspended";
      partner.isAvailable = false;
      partner.isOnline = false;
      await User.findByIdAndUpdate(partner.user, { isActive: false });
    } else if (action === "reactivate") {
      partner.approvalStatus = "approved";
      await User.findByIdAndUpdate(partner.user, { isActive: true });
    } else {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    await partner.save();
    res.status(200).json({ success: true, partner: publicPartner(partner, { reveal: true }) });
  } catch (error) {
    next(error);
  }
};

export const adminCreateOffer = async (req, res, next) => {
  try {
    const { orderId, deliveryFee, partnerIds, instructions, expiresInMinutes = 30 } = req.body;
    if (!orderId || deliveryFee == null) {
      return res.status(400).json({ success: false, message: "orderId and deliveryFee required" });
    }

    const order = await Order.findById(orderId).populate("customer", "name mobile");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (["Delivered", "Cancelled"].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: "Order cannot be offered" });
    }

    let offeredTo = [];
    if (Array.isArray(partnerIds) && partnerIds.length > 0) {
      offeredTo = partnerIds;
    } else {
      const available = await DeliveryPartner.find({
        approvalStatus: "approved",
        isAvailable: true,
        emailVerified: true,
        selfieVerification: { $ne: "rejected" }
      }).select("_id");
      offeredTo = available.map((p) => p._id);
    }

    if (offeredTo.length === 0) {
      return res.status(400).json({ success: false, message: "No eligible delivery partners" });
    }

    // Expire previous open offers for this order
    await DeliveryAssignment.updateMany(
      { order: orderId, status: "available" },
      { $set: { status: "expired" }, $push: { history: { previousStatus: "available", newStatus: "expired", note: "Superseded by new offer" } } }
    );

    const areaLabel = [order.shippingAddress?.city, order.shippingAddress?.zipCode].filter(Boolean).join(" · ");
    const assignment = await DeliveryAssignment.create({
      order: orderId,
      deliveryFee: Number(deliveryFee),
      status: "available",
      offeredTo,
      areaLabel,
      instructions: instructions || "",
      expiresAt: new Date(Date.now() + Number(expiresInMinutes) * 60 * 1000),
      assignedAt: new Date(),
      createdBy: req.user._id,
      history: [{
        previousStatus: null,
        newStatus: "available",
        by: req.user._id,
        note: `Offered to ${offeredTo.length} partner(s) at ₹${deliveryFee}`
      }]
    });

    order.deliveryFee = Number(deliveryFee);
    order.deliveryAssignment = assignment._id;
    await order.save();

    // Notify partners (SMS/email without full address)
    const partners = await DeliveryPartner.find({ _id: { $in: offeredTo } });
    await Promise.all(
      partners.map(async (p) => {
        try {
          if (p.mobile) {
            await sendSMS(
              p.mobile,
              `New delivery offer: ${areaLabel || "your area"} · Fee ₹${deliveryFee}. Open Zentro Delivery app. Expires in ${expiresInMinutes}m.`
            );
          }
          if (p.email) {
            await sendEmail({
              to: p.email,
              subject: "New delivery available",
              html: `<p>New delivery in <b>${areaLabel}</b></p><p>Fee: ₹${deliveryFee}</p><p>Order: ${order.orderNumber}</p><p>Accept in your dashboard before it expires.</p>`
            });
          }
          if (req.io) {
            const partnerUserId = String(p.user);
            req.io.to(`partner_${partnerUserId}`).emit("deliveryOffer", {
              assignmentId: assignment._id,
              fee: deliveryFee,
              areaLabel,
              orderNumber: order.orderNumber
            });
          }
        } catch {
          // continue
        }
      })
    );

    res.status(201).json({ success: true, assignment });
  } catch (error) {
    next(error);
  }
};

export const adminDeliveryOverview = async (req, res, next) => {
  try {
    const [
      totalPartners,
      activePartners,
      pendingVerification,
      availablePartners,
      busyPartners,
      totalDeliveries,
      pendingDeliveries,
      completedDeliveries,
      rejectedDeliveries,
      failedDeliveries
    ] = await Promise.all([
      DeliveryPartner.countDocuments(),
      DeliveryPartner.countDocuments({ approvalStatus: "approved" }),
      DeliveryPartner.countDocuments({ approvalStatus: "pending" }),
      DeliveryPartner.countDocuments({ approvalStatus: "approved", isAvailable: true }),
      DeliveryPartner.countDocuments({ approvalStatus: "approved", isAvailable: false }),
      DeliveryAssignment.countDocuments(),
      DeliveryAssignment.countDocuments({ status: { $in: ["available", "accepted", "picked_up", "out_for_delivery"] } }),
      DeliveryAssignment.countDocuments({ status: "delivered" }),
      DeliveryAssignment.countDocuments({ "rejectedBy.0": { $exists: true } }),
      DeliveryAssignment.countDocuments({ status: "failed" })
    ]);

    const paid = await DeliveryAssignment.aggregate([
      { $match: { status: "delivered" } },
      { $group: { _id: null, total: { $sum: "$deliveryFee" } } }
    ]);

    res.status(200).json({
      success: true,
      overview: {
        totalPartners,
        activePartners,
        pendingVerification,
        availablePartners,
        busyPartners,
        totalDeliveries,
        pendingDeliveries,
        completedDeliveries,
        rejectedDeliveries,
        failedDeliveries,
        totalDeliveryPayments: paid[0]?.total || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const adminListAssignments = async (req, res, next) => {
  try {
    const { status, partnerId, search, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (partnerId) filter.acceptedBy = partnerId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    let assignments = await DeliveryAssignment.find(filter)
      .populate({
        path: "order",
        select: "orderNumber shippingAddress customer pricing orderStatus",
        populate: { path: "customer", select: "name mobile" }
      })
      .populate("acceptedBy", "fullName mobile email vehicleNumber")
      .sort("-createdAt")
      .limit(200);

    if (search) {
      const q = search.toLowerCase();
      assignments = assignments.filter(
        (a) =>
          a.order?.orderNumber?.toLowerCase().includes(q) ||
          a.acceptedBy?.fullName?.toLowerCase().includes(q) ||
          a.areaLabel?.toLowerCase().includes(q)
      );
    }

    res.status(200).json({ success: true, assignments });
  } catch (error) {
    next(error);
  }
};
