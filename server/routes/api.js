import express from "express";
import authRouter from "./auth.js";
import productsRouter from "./products.js";
import ordersRouter from "./orders.js";
import usersRouter from "./users.js";
import couponsRouter from "./coupons.js";
import paymentsRouter from "./payments.js";
import deliveryRouter from "./delivery.js";
import adminRouter from "./admin.js";
import reviewsRouter from "./reviews.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/users", usersRouter);
router.use("/coupons", couponsRouter);
router.use("/payments", paymentsRouter);
router.use("/delivery", deliveryRouter);
router.use("/admin", adminRouter);
router.use("/reviews", reviewsRouter);

export default router;
