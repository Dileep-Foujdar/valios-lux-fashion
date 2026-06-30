import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  theme: "system",
  seo: {
    title: "VALOIS Luxury Fashion",
    metaDescription: "Experience luxury fashion shopping with fast shipping and secure payments."
  },
  bannerImages: [],
  heroSlider: [],
  footerDetails: {
    contactEmail: "support@valois.com",
    contactPhone: "+91 9999999999",
    address: "123 Fashion St, Mumbai, India"
  },
  deliveryCharges: {
    minAmountForFreeDelivery: 999,
    defaultCharge: 99
  },
  taxPercentage: {
    gst: 18
  }
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setStorefrontSettings: (state, action) => {
      return {
        ...state,
        ...action.payload
      };
    },
    updateThemePreference: (state, action) => {
      state.theme = action.payload;
    }
  }
});

export const { setStorefrontSettings, updateThemePreference } = settingsSlice.actions;
export default settingsSlice.reducer;
