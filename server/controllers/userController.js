import User from "../models/User.js";
import Product from "../models/Product.js";
import { normalizeMobile, isValidIndianMobile } from "../utils/mobile.js";
import { bumpProductCounter } from "../utils/productMetrics.js";
import { parseBool } from "../utils/queryHelpers.js";
import { lookupPincode } from "../utils/geocode.js";

const CART_PRODUCT_FIELDS = "title images salePrice mrp stock brand discount rating colors sizes";

/** Ensure every cart line has a populated product object (never bare id). */
const serializeCart = (cart = []) =>
  (cart || [])
    .filter((c) => c && c.product && typeof c.product === "object" && c.product._id)
    .map((c) => ({
      _id: c._id,
      quantity: c.quantity,
      color: c.color || "",
      size: c.size || "",
      product: {
        _id: c.product._id,
        title: c.product.title,
        images: c.product.images || [],
        salePrice: c.product.salePrice,
        mrp: c.product.mrp,
        stock: c.product.stock,
        brand: c.product.brand,
        discount: c.product.discount,
        rating: c.product.rating,
        colors: c.product.colors,
        sizes: c.product.sizes
      }
    }));

const loadPopulatedCart = async (userId) => {
  const user = await User.findById(userId).populate("cart.product", CART_PRODUCT_FIELDS);
  if (!user) return [];

  const origCount = user.cart.length;
  const validCart = user.cart.filter((c) => c && c.product && c.product._id);

  if (validCart.length !== origCount) {
    user.cart = validCart.map((c) => ({
      product: c.product._id,
      quantity: c.quantity,
      color: c.color,
      size: c.size
    }));
    await user.save();
    const refreshed = await User.findById(userId).populate("cart.product", CART_PRODUCT_FIELDS);
    return serializeCart(refreshed.cart);
  }

  return serializeCart(validCart);
};

// 1. Get User Profile (req.user populated by auth middleware)
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("wishlist", "title images salePrice mrp brand stock")
      .populate("cart.product", CART_PRODUCT_FIELDS);

    // Purge any deleted products from wishlist & cart
    let needsSave = false;
    if (user.wishlist) {
      const origCount = user.wishlist.length;
      user.wishlist = user.wishlist.filter(w => w !== null && w && w._id);
      if (user.wishlist.length !== origCount) needsSave = true;
    }

    if (user.cart) {
      const origCount = user.cart.length;
      user.cart = user.cart.filter(c => c && c.product !== null && c.product?._id);
      if (user.cart.length !== origCount) needsSave = true;
    }

    if (needsSave) {
      const dbUser = await User.findById(req.user._id);
      dbUser.wishlist = user.wishlist.map(w => w._id);
      dbUser.cart = user.cart.map(c => ({
        product: c.product._id,
        quantity: c.quantity,
        color: c.color,
        size: c.size
      }));
      await dbUser.save();
    }

    const userObj = user.toObject();
    userObj.cart = serializeCart(user.cart);

    res.status(200).json({ success: true, user: userObj });
  } catch (error) {
    next(error);
  }
};

// 2. Update Profile Name, Email, Mobile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, mobile } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase().trim();

    if (mobile !== undefined) {
      const normalized = normalizeMobile(mobile);
      if (!normalized) {
        return res.status(400).json({
          success: false,
          message: "Mobile number is compulsory"
        });
      }
      if (!isValidIndianMobile(normalized)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid 10-digit Indian mobile number"
        });
      }

      const taken = await User.findOne({
        mobile: normalized,
        _id: { $ne: user._id }
      });
      if (taken) {
        return res.status(400).json({
          success: false,
          message: "This mobile number is already linked to another account"
        });
      }
      user.mobile = normalized;
    }

    // Customers must always keep a mobile number
    if (user.role === "Customer" && !user.mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is compulsory for customer accounts"
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user
    });
  } catch (error) {
    next(error);
  }
};

// 2b. Save notification + location permissions (post-login onboarding)
export const updatePermissions = async (req, res, next) => {
  try {
    const { mobile, notifications, location, completeOnboarding } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (mobile !== undefined) {
      const normalized = normalizeMobile(mobile);
      if (!normalized || !isValidIndianMobile(normalized)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid 10-digit Indian mobile number"
        });
      }
      const taken = await User.findOne({
        mobile: normalized,
        _id: { $ne: user._id }
      });
      if (taken) {
        return res.status(400).json({
          success: false,
          message: "This mobile number is already linked to another account"
        });
      }
      user.mobile = normalized;
    }

    if (notifications && typeof notifications === "object") {
      user.notifications = {
        permission: ["granted", "denied", "default"].includes(notifications.permission)
          ? notifications.permission
          : user.notifications?.permission || "default",
        enabled: Boolean(notifications.enabled),
        askedAt: notifications.askedAt ? new Date(notifications.askedAt) : new Date()
      };
    }

    if (location && typeof location === "object") {
      user.location = {
        permission: ["granted", "denied", "prompt", "unavailable"].includes(location.permission)
          ? location.permission
          : user.location?.permission || "prompt",
        latitude: typeof location.latitude === "number" ? location.latitude : user.location?.latitude,
        longitude: typeof location.longitude === "number" ? location.longitude : user.location?.longitude,
        accuracy: typeof location.accuracy === "number" ? location.accuracy : user.location?.accuracy,
        city: location.city || user.location?.city,
        updatedAt: new Date()
      };
    }

    if (completeOnboarding) {
      if (!user.mobile) {
        return res.status(400).json({
          success: false,
          message: "Mobile number is compulsory before finishing setup"
        });
      }
      user.permissionsOnboardingCompleted = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Preferences saved",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        walletBalance: user.walletBalance,
        referralCode: user.referralCode,
        notifications: user.notifications,
        location: user.location,
        permissionsOnboardingCompleted: user.permissionsOnboardingCompleted
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Add Address
export const addAddress = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      houseNo,
      street,
      landmark,
      city,
      state,
      zipCode,
      country,
      latitude,
      longitude,
      isDefault
    } = req.body;

    const { isValidIndianMobile, normalizeIndianMobile, isValidPin } = await import("../utils/cryptoSensitive.js");
    const mobile = normalizeIndianMobile(phone);
    if (!isValidIndianMobile(mobile)) {
      return res.status(400).json({ success: false, message: "Enter a valid 10-digit Indian mobile number" });
    }
    if (!name?.trim() || !street?.trim() || !city?.trim() || !state?.trim()) {
      return res.status(400).json({ success: false, message: "Name, street, city and state are required" });
    }
    if (!isValidPin(zipCode)) {
      return res.status(400).json({ success: false, message: "Enter a valid 6-digit PIN code" });
    }

    const user = await User.findById(req.user._id);

    // If making this default, reset other addresses default values
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push({
      name: name.trim(),
      phone: mobile,
      houseNo: houseNo || "",
      street: street.trim(),
      landmark: landmark || "",
      city: city.trim(),
      state: state.trim(),
      zipCode: String(zipCode).trim(),
      country: country || "India",
      latitude: latitude != null ? Number(latitude) : undefined,
      longitude: longitude != null ? Number(longitude) : undefined,
      isDefault: isDefault || false
    });

    // If it's the first address, make it default automatically
    if (user.addresses.length === 1) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address added successfully",
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Address
export const deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Find index
    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === req.params.id);
    if (addressIndex === -1) {
      return res.status(404).json({ success: false, message: "Address not found", code: "NOT_FOUND" });
    }

    const wasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    // If default was deleted, make first remaining address default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

// 4b. Update Address
export const updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const addr = user.addresses.id(req.params.id);
    if (!addr) {
      return res.status(404).json({ success: false, message: "Address not found", code: "NOT_FOUND" });
    }

    const {
      name, phone, houseNo, street, landmark, city, state, zipCode, country,
      latitude, longitude, isDefault
    } = req.body;

    const { isValidIndianMobile: validMobile, normalizeIndianMobile, isValidPin } = await import("../utils/cryptoSensitive.js");

    if (phone != null) {
      const mobile = normalizeIndianMobile(phone);
      if (!validMobile(mobile)) {
        return res.status(400).json({ success: false, message: "Enter a valid 10-digit Indian mobile number" });
      }
      addr.phone = mobile;
    }
    if (name != null) addr.name = String(name).trim();
    if (houseNo != null) addr.houseNo = houseNo;
    if (street != null) addr.street = String(street).trim();
    if (landmark != null) addr.landmark = landmark;
    if (city != null) addr.city = String(city).trim();
    if (state != null) addr.state = String(state).trim();
    if (zipCode != null) {
      if (!isValidPin(zipCode)) {
        return res.status(400).json({ success: false, message: "Enter a valid 6-digit PIN code" });
      }
      addr.zipCode = String(zipCode).trim();
    }
    if (country != null) addr.country = country;
    if (latitude != null) addr.latitude = Number(latitude);
    if (longitude != null) addr.longitude = Number(longitude);

    if (parseBool(isDefault)) {
      user.addresses.forEach((a) => { a.isDefault = false; });
      addr.isDefault = true;
    }

    await user.save();
    res.status(200).json({ success: true, message: "Address updated", addresses: user.addresses, address: addr });
  } catch (error) {
    next(error);
  }
};

// 4c. Set default address
export const setDefaultAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const addr = user.addresses.id(req.params.id);
    if (!addr) {
      return res.status(404).json({ success: false, message: "Address not found", code: "NOT_FOUND" });
    }
    user.addresses.forEach((a) => { a.isDefault = false; });
    addr.isDefault = true;
    await user.save();
    res.status(200).json({ success: true, message: "Default address set", addresses: user.addresses });
  } catch (error) {
    next(error);
  }
};

// 4d. PIN → city/state
export const getPincodeLookup = async (req, res, next) => {
  try {
    const result = await lookupPincode(req.params.pin);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "PIN lookup failed", code: "PIN_INVALID" });
  }
};

// 5. Sync / Get Cart
export const getCart = async (req, res, next) => {
  try {
    const cart = await loadPopulatedCart(req.user._id);
    res.status(200).json({ success: true, cart });
  } catch (error) {
    next(error);
  }
};

// 6. Update / Add Item in Cart
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity, color, size } = req.body;
    const user = await User.findById(req.user._id);

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found", code: "NOT_FOUND" });
    }

    // Check if item with same productId, color, size exists
    const itemIndex = user.cart.findIndex(
      item => item.product.toString() === productId && item.color === color && item.size === size
    );

    let isNewLine = false;
    if (itemIndex > -1) {
      user.cart[itemIndex].quantity += Number(quantity || 1);
    } else {
      isNewLine = true;
      user.cart.push({
        product: productId,
        quantity: Number(quantity || 1),
        color,
        size
      });
    }

    await user.save();
    if (isNewLine) {
      await bumpProductCounter(productId, "cartCount", 1).catch(() => {});
    }

    const cart = await loadPopulatedCart(req.user._id);

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      cart
    });
  } catch (error) {
    next(error);
  }
};

// 7. Update Cart Item Quantity
export const updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const user = await User.findById(req.user._id);

    const itemIndex = user.cart.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in cart", code: "NOT_FOUND" });
    }

    const removedProductId =
      Number(quantity) <= 0 ? user.cart[itemIndex].product : null;

    if (Number(quantity) <= 0) {
      user.cart.splice(itemIndex, 1); // remove
    } else {
      user.cart[itemIndex].quantity = Number(quantity);
    }

    await user.save();
    if (removedProductId) {
      await bumpProductCounter(removedProductId, "cartCount", -1).catch(() => {});
    }
    const cart = await loadPopulatedCart(req.user._id);

    res.status(200).json({
      success: true,
      message: "Cart updated",
      cart
    });
  } catch (error) {
    next(error);
  }
};

// 8. Toggle Product in Wishlist
export const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }
    const user = await User.findById(req.user._id);
    if (!user.wishlist) user.wishlist = [];

    const wishIndex = user.wishlist.findIndex((id) => id.toString() === productId.toString());
    let message = "";

    if (wishIndex > -1) {
      user.wishlist.splice(wishIndex, 1);
      message = "Product removed from wishlist";
      await bumpProductCounter(productId, "wishlistCount", -1).catch(() => {});
    } else {
      user.wishlist.push(productId);
      message = "Product added to wishlist";
      await bumpProductCounter(productId, "wishlistCount", 1).catch(() => {});
    }

    await user.save();

    res.status(200).json({
      success: true,
      message,
      wishlist: user.wishlist
    });
  } catch (error) {
    next(error);
  }
};

// 9. Toggle Like Product
export const toggleLike = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }
    const user = await User.findById(req.user._id);
    if (!user.likes) user.likes = [];

    const likeIndex = user.likes.indexOf(productId);
    let message = "";

    if (likeIndex > -1) {
      user.likes.splice(likeIndex, 1);
      message = "Product unliked";
    } else {
      user.likes.push(productId);
      message = "Product liked";
    }

    await user.save();

    res.status(200).json({
      success: true,
      message,
      likes: user.likes
    });
  } catch (error) {
    next(error);
  }
};

// 10. Get Wallet & Referrals Info
export const getWalletAndReferrals = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Find users referred by this user
    const referredUsers = await User.find({ referredBy: req.user._id }).select("name email role createdAt");

    res.status(200).json({
      success: true,
      walletBalance: user.walletBalance,
      referralCode: user.referralCode,
      referredCount: referredUsers.length,
      referredUsers
    });
  } catch (error) {
    next(error);
  }
};
