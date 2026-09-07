import { createSlice } from "@reduxjs/toolkit";
import { DEFAULT_PRODUCT_VISIBILITY } from "../../utils/productDisplay.js";

const initialState = {
  theme: "system",
  brandName: "Zentro",
  logoUrl: "/logo.png?v=5",
  faviconUrl: "/favicon.png?v=5",
  seo: {
    title: "Zentro | Shop Everything",
    metaDescription: "Zentro — Men, Women, Kids, Home, Beauty & more. Shop fashion, electronics, and everyday essentials."
  },
  bannerImages: [],
  heroSlider: [],
  footerDetails: {
    contactEmail: "support@zentro.com",
    contactPhone: "+91 9999999999",
    address: "123 Commerce St, Mumbai, India"
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
