import Product from "../models/Product.js";

/** Apply sold/revenue/order increments from order line items */
export const applyOrderSalesMetrics = async (order, { refund = false, returned = false } = {}) => {
  if (!order?.items?.length) return;

  for (const item of order.items) {
    const productId = item.product?._id || item.product;
    if (!productId) continue;
    const qty = Number(item.quantity) || 0;
    const lineRevenue = qty * (Number(item.price) || 0);

    if (returned) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { returnCount: 1, soldCount: -qty, revenue: -lineRevenue }
      });
      continue;
    }

    if (refund) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { refundCount: 1 }
      });
      continue;
    }

    await Product.findByIdAndUpdate(productId, {
      $inc: {
        soldCount: qty,
        revenue: lineRevenue,
        orderCount: 1
      }
    });
  }
};

export const bumpProductCounter = async (productId, field, delta = 1) => {
  if (!productId || !field) return;
  await Product.findByIdAndUpdate(productId, { $inc: { [field]: delta } });
};
