import { createSlice } from "@reduxjs/toolkit";
import { DEFAULT_PRODUCT_VISIBILITY } from "../../utils/productDisplay.js";

const initialState = {
  theme: "system",
  brandName: "Kirnya Fashion Brand",
  logoUrl: "/logo.png",
  faviconUrl: "/favicon.ico",
  seo: {
    title: "Kirnya | Premium Fashion Brand",
    metaDescription: "Experience Kirnya luxury fashion clothing, shoes, watches, and accessories."
  },
  bannerImages: [],
  heroSlider: [],
  footerDetails: {
    contactEmail: "support@kirnya.com",
    contactPhone: "+91 9999999999",
    address: "123 Fashion St, Mumbai, India"
  },
  deliveryCharges: {
    minAmountForFreeDelivery: 999,
    defaultCharge: 99
  },
  taxPercentage: {
    gst: 18
  },
  productVisibility: { ...DEFAULT_PRODUCT_VISIBILITY },
  badgeLibrary: [],
  storefront: {
    showProductCounts: false,
    showCategoryCounts: false,
    showBrandCounts: false
  }
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setStorefrontSettings: (state, action) => {
      const payload = action.payload || {};
      return {
        ...state,
        ...payload,
        productVisibility: {
          ...DEFAULT_PRODUCT_VISIBILITY,
          ...(payload.productVisibility || state.productVisibility || {})
        },
        storefront: {
          ...state.storefront,
          ...(payload.storefront || {})
        }
      };
    },
    updateThemePreference: (state, action) => {
      state.theme = action.payload;
    }
  }
});

export const { setStorefrontSettings, updateThemePreference } = settingsSlice.actions;
export default settingsSlice.reducer;
