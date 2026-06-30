import Coupon from "../models/Coupon.js";

// 1. Create Coupon (Admin/Owner)
export const createCoupon = async (req, res, next) => {
  try {
    const { code, discountType, value, minPurchase, maxDiscount, expiryDate, usageLimit } = req.body;

    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existingCoupon) {
      return res.status(400).json({ success: false, message: "Coupon code already exists" });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountType,
      value,
      minPurchase,
      maxDiscount,
      expiryDate,
      usageLimit
    });

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get All Coupons (Admin/Owner)
export const getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort("-createdAt");
    res.status(200).json({ success: true, coupons });
  } catch (error) {
    next(error);
  }
};

// 3. Update Coupon (Admin/Owner)
export const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon
    });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Coupon (Admin/Owner)
export const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

// 5. Validate Coupon Code (Customer checkout)
export const validateCoupon = async (req, res, next) => {
  try {
    const { code, cartSubtotal } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Please provide a coupon code" });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true });

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid coupon code" });
    }

    // Expiry Check
    if (new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ success: false, message: "Coupon code has expired" });
    }

    // Usage Limit Check
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    }

    // Check if user already used this coupon
    if (coupon.usersUsed.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: "You have already used this coupon code" });
    }

    // Minimum Purchase check
    if (Number(cartSubtotal) < coupon.minPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of ₹${coupon.minPurchase} required to apply this coupon`
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "Percentage") {
      discount = Math.round(Number(cartSubtotal) * (coupon.value / 100));
      if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      discount,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        value: coupon.value
      }
    });
  } catch (error) {
    next(error);
  }
};
