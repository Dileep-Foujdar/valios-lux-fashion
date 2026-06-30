import React from "react";
import ProductDetailClient from "./ProductDetailClient.js";

// Next.js 16 - Await the async params prop before rendering child client-side components
export default async function ProductDetailPage(props) {
  const { id } = await props.params;

  return <ProductDetailClient productId={id} />;
}
