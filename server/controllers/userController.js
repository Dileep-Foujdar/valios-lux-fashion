import User from "../models/User.js";
import Product from "../models/Product.js";

// 1. Get User Profile (req.user populated by auth middleware)
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist", "title images salePrice mrp brand stock");
    res.status(200).json({ success: true, user });
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
      user.mobile = (mobile && mobile.trim() !== "") ? mobile.trim() : undefined;
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

// 3. Add Address
export const addAddress = async (req, res, next) => {
  try {
    const { name, phone, street, city, state, zipCode, country, isDefault } = req.body;
    const user = await User.findById(req.user._id);

    // If making this default, reset other addresses default values
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push({
      name,
      phone,
      street,
      city,
      state,
      zipCode,
      country: country || "India",
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
      return res.status(404).json({ success: false, message: "Address not found" });
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

// 5. Sync / Get Cart
export const getCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("cart.product", "title images salePrice mrp stock brand");
    res.status(200).json({
      success: true,
      cart: user.cart
    });
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
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if item with same productId, color, size exists
    const itemIndex = user.cart.findIndex(
      item => item.product.toString() === productId && item.color === color && item.size === size
    );

    if (itemIndex > -1) {
      user.cart[itemIndex].quantity += Number(quantity || 1);
    } else {
      user.cart.push({
        product: productId,
        quantity: Number(quantity || 1),
        color,
        size
      });
    }

    await user.save();
    
    const populatedUser = await User.findById(req.user._id).populate("cart.product", "title images salePrice mrp stock brand");

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      cart: populatedUser.cart
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
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    if (Number(quantity) <= 0) {
      user.cart.splice(itemIndex, 1); // remove
    } else {
      user.cart[itemIndex].quantity = Number(quantity);
    }

    await user.save();
    const populatedUser = await User.findById(req.user._id).populate("cart.product", "title images salePrice mrp stock brand");

    res.status(200).json({
      success: true,
      message: "Cart updated",
      cart: populatedUser.cart
    });
  } catch (error) {
    next(error);
  }
};

// 8. Toggle Product in Wishlist
export const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.user._id);

    const wishIndex = user.wishlist.indexOf(productId);
    let message = "";

    if (wishIndex > -1) {
      user.wishlist.splice(wishIndex, 1);
      message = "Product removed from wishlist";
    } else {
      user.wishlist.push(productId);
      message = "Product added to wishlist";
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
    const user = await User.findById(req.user._id);

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
