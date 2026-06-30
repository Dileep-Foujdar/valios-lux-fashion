import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [], // Array of { _id, product: { _id, title, images, salePrice, mrp, stock }, quantity, color, size }
  coupon: null, // Applied coupon object
  couponDiscount: 0,
  gst: 0,
  shipping: 0,
  subtotal: 0,
  total: 0
};

const calculateTotalsHelper = (state, settings = { gst: 18, minFreeDelivery: 999, defaultCharge: 99 }) => {
  let subtotal = 0;
  state.items.forEach(item => {
    const price = item.product?.salePrice || item.price || 0;
    subtotal += price * item.quantity;
  });

  state.subtotal = subtotal;
  state.gst = Math.round(subtotal * (settings.gst / 100));
  state.shipping = subtotal === 0 || subtotal >= settings.minFreeDelivery ? 0 : settings.defaultCharge;

  // Coupon discount calculations
  if (state.coupon) {
    if (subtotal >= state.coupon.minPurchase) {
      if (state.coupon.discountType === "Percentage") {
        state.couponDiscount = Math.round(subtotal * (state.coupon.value / 100));
        if (state.coupon.maxDiscount > 0 && state.couponDiscount > state.coupon.maxDiscount) {
          state.couponDiscount = state.coupon.maxDiscount;
        }
      } else {
        state.couponDiscount = state.coupon.value;
      }
    } else {
      // Cart value dropped below minPurchase, invalidate coupon
      state.coupon = null;
      state.couponDiscount = 0;
    }
  } else {
    state.couponDiscount = 0;
  }

  state.total = state.subtotal + state.gst + state.shipping - state.couponDiscount;
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCart: (state, action) => {
      state.items = action.payload;
      calculateTotalsHelper(state);
    },
    localAddToCart: (state, action) => {
      const { product, quantity, color, size } = action.payload;
      const index = state.items.findIndex(
        item => item.product._id === product._id && item.color === color && item.size === size
      );

      if (index > -1) {
        state.items[index].quantity += Number(quantity);
      } else {
        state.items.push({
          _id: `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          product,
          quantity: Number(quantity),
          color,
          size
        });
      }
      calculateTotalsHelper(state);
    },
    localUpdateCartQty: (state, action) => {
      const { itemId, quantity } = action.payload;
      const index = state.items.findIndex(item => item._id === itemId);
      if (index > -1) {
        if (Number(quantity) <= 0) {
          state.items.splice(index, 1);
        } else {
          state.items[index].quantity = Number(quantity);
        }
      }
      calculateTotalsHelper(state);
    },
    localRemoveFromCart: (state, action) => {
      state.items = state.items.filter(item => item._id !== action.payload);
      calculateTotalsHelper(state);
    },
    applyCouponCode: (state, action) => {
      state.coupon = action.payload;
      calculateTotalsHelper(state);
    },
    removeCouponCode: (state) => {
      state.coupon = null;
      state.couponDiscount = 0;
      calculateTotalsHelper(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.coupon = null;
      state.couponDiscount = 0;
      state.gst = 0;
      state.shipping = 0;
      state.subtotal = 0;
      state.total = 0;
    },
    recalculateTotals: (state, action) => {
      calculateTotalsHelper(state, action.payload);
    }
  }
});

export const {
  setCart,
  localAddToCart,
  localUpdateCartQty,
  localRemoveFromCart,
  applyCouponCode,
  removeCouponCode,
  clearCart,
  recalculateTotals
} = cartSlice.actions;

export default cartSlice.reducer;
