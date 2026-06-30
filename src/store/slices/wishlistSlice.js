import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [] // Array of Product objects
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    setWishlist: (state, action) => {
      state.items = action.payload || [];
    },
    localToggleWishlist: (state, action) => {
      const product = action.payload;
      const index = state.items.findIndex(item => item._id === product._id);
      if (index > -1) {
        state.items.splice(index, 1); // remove
      } else {
        state.items.push(product); // add
      }
    },
    clearWishlist: (state) => {
      state.items = [];
    }
  }
});

export const { setWishlist, localToggleWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
