"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { IoLocationOutline, IoWalletOutline, IoCardOutline, IoCashOutline, IoCheckmarkCircleOutline, IoPhonePortraitOutline, IoNavigateOutline } from "react-icons/io5";
import toast from "react-hot-toast";

import Navbar from "../../components/Navbar.js";
import Footer from "../../components/Footer.js";
import { clearCart } from "../../store/slices/cartSlice.js";
import api from "../../utils/api.js";

const normalizeMobile = (raw) => {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits;
};
const isValidIndianMobile = (v) => /^[6-9]\d{9}$/.test(normalizeMobile(v));
const isValidPin = (v) => /^\d{6}$/.test(String(v || "").trim());

const waitForRazorpay = () =>
  new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (typeof window !== "undefined" && window.Razorpay) {
        clearInterval(timer);
        resolve(window.Razorpay);
      } else if (tries > 40) {
        clearInterval(timer);
        reject(new Error("Razorpay checkout failed to load. Please refresh and try again."));
      }
    }, 100);
  });

const CheckoutPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const { items, subtotal, gst, shipping, coupon, couponDiscount, total } = useSelector((state) => state.cart);
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // DB profile states
  const [addresses, setAddresses] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Selection States
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Razorpay"); // Razorpay (default), COD
  const [useWallet, setUseWallet] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [locating, setLocating] = useState(false);

  // Address Form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      phone: "",
      houseNo: "",
      street: "",
      landmark: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India",
      latitude: "",
      longitude: ""
    }
  });

  // Redirect if cart is empty or user is logged out
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }
    if (items.length === 0) {
      router.push("/cart");
    }
  }, [items, isAuthenticated, router]);

  // Fetch address and wallet profile info
  const fetchProfileInfo = async () => {
    try {
      const [profRes, walletRes] = await Promise.all([
        api.get("/users/profile"),
        api.get("/users/wallet-referrals")
      ]);

      if (profRes.data.success) {
        setAddresses(profRes.data.user.addresses || []);
        // Pre-select default address
        const defaultAddr = profRes.data.user.addresses.find(a => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr._id);
        } else if (profRes.data.user.addresses.length > 0) {
          setSelectedAddressId(profRes.data.user.addresses[0]._id);
        }
      }

      if (walletRes.data.success) {
        setWalletBalance(walletRes.data.walletBalance || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchProfileInfo();
    }
  }, [isAuthenticated]);

  const useLiveLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported on this device");
      return;
    }
    toast(
      "We use your location only to autofill delivery address fields. You can edit everything before saving.",
      { duration: 4000 }
    );
    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });
      const { latitude, longitude } = position.coords;
      const res = await api.post("/users/geocode/reverse", { latitude, longitude });
      if (!res.data.success) throw new Error(res.data.message || "Geocode failed");
      const a = res.data.address;
      if (a.houseNo) setValue("houseNo", a.houseNo);
      if (a.street) setValue("street", a.street);
      if (a.landmark) setValue("landmark", a.landmark);
      if (a.city) setValue("city", a.city);
      if (a.state) setValue("state", a.state);
      if (a.country) setValue("country", a.country);
      if (a.zipCode) setValue("zipCode", a.zipCode);
      setValue("latitude", String(latitude));
      setValue("longitude", String(longitude));
      toast.success("Address filled from your live location — please review and edit if needed");
    } catch (err) {
      if (err?.code === 1) toast.error("Location permission denied. Enter address manually.");
      else toast.error(err.response?.data?.message || err.message || "Could not fetch location");
    } finally {
      setLocating(false);
    }
  };

  // Add Address Form Submit
  const onAddressSubmit = async (data) => {
    if (!isValidIndianMobile(data.phone)) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }
    if (!isValidPin(data.zipCode)) {
      toast.error("Enter a valid 6-digit PIN code");
      return;
    }
    try {
      const payload = {
        ...data,
        phone: normalizeMobile(data.phone),
        latitude: data.latitude ? Number(data.latitude) : undefined,
        longitude: data.longitude ? Number(data.longitude) : undefined,
        isDefault: addresses.length === 0
      };
      const res = await api.post("/users/address", payload);
      if (res.data.success) {
        toast.success("Address added successfully!");
        setAddresses(res.data.addresses);
        setShowAddressForm(false);
        reset();

        const lastAddr = res.data.addresses[res.data.addresses.length - 1];
        if (lastAddr) setSelectedAddressId(lastAddr._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add address.");
    }
  };

  // Place Order Action
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select a shipping address");
      return;
    }

    const selectedAddr = addresses.find(a => a._id === selectedAddressId);
    if (!selectedAddr) return;

    if (!isValidIndianMobile(selectedAddr.phone || user?.mobile)) {
      toast.error("Selected address needs a valid mobile number. Please add a new address.");
      return;
    }

    setIsPlacingOrder(true);
    const loadId = toast.loading("Processing order checkout...");

    try {
      // 1. Create order on backend
      const checkoutItems = items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        price: item.product.salePrice
      }));

      const res = await api.post("/orders", {
        items: checkoutItems,
        shippingAddress: {
          name: selectedAddr.name,
          phone: normalizeMobile(selectedAddr.phone),
          houseNo: selectedAddr.houseNo || "",
          street: selectedAddr.street,
          landmark: selectedAddr.landmark || "",
          city: selectedAddr.city,
          state: selectedAddr.state,
          zipCode: selectedAddr.zipCode,
          country: selectedAddr.country || "India",
          latitude: selectedAddr.latitude,
          longitude: selectedAddr.longitude
        },
        paymentMethod,
        couponCode: coupon?.code,
        useWallet
      });

      if (res.data.success) {
        const { order, amountToPay } = res.data;

        // Fully wallet-paid or Cash on Delivery — no gateway needed
        if (amountToPay === 0 || paymentMethod === "COD") {
          toast.success("Order placed successfully!", { id: loadId });
          dispatch(clearCart());
          router.push(`/checkout/success?gateway=${paymentMethod.toLowerCase()}&orderId=${order._id}`);
          return;
        }

        // Razorpay (UPI / Cards / Netbanking / Wallets)
        if (paymentMethod === "Razorpay") {
          const payRes = await api.post("/payments/razorpay", { orderId: order._id });
          if (!payRes.data.success) {
            throw new Error(payRes.data.message || "Failed to start Razorpay payment");
          }

          const {
            mode,
            amount,
            currency,
            orderId: rzpOrderId,
            keyId,
            orderNumber
          } = payRes.data;

          // Dev mock when live Razorpay keys are not configured
          if (mode === "mock") {
            toast.loading("Processing Razorpay (test mode)...", { id: loadId });
            const verifyRes = await api.post("/payments/verify", {
              gateway: "razorpay",
              orderId: order._id,
              razorpayPaymentId: `pay_mock_${Date.now()}`,
              razorpayOrderId: rzpOrderId,
              razorpaySignature: "mock_signature"
            });

            if (verifyRes.data.success) {
              toast.success("Payment successful (test mode)!", { id: loadId });
              dispatch(clearCart());
              router.push(`/checkout/success?gateway=razorpay&orderId=${order._id}`);
            } else {
              toast.error("Payment verification failed", { id: loadId });
            }
            return;
          }

          toast.loading("Opening Razorpay...", { id: loadId });
          const RazorpayCheckout = await waitForRazorpay();

          const options = {
            key: keyId,
            amount,
            currency: currency || "INR",
            name: "Zentro",
            description: `Order #${orderNumber || order.orderNumber}`,
            order_id: rzpOrderId,
            handler: async (response) => {
              const verifyToast = toast.loading("Verifying payment...");
              try {
                const verifyRes = await api.post("/payments/verify", {
                  gateway: "razorpay",
                  orderId: order._id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature
                });
                if (verifyRes.data.success) {
                  toast.success("Payment successful!", { id: verifyToast });
                  dispatch(clearCart());
                  router.push(`/checkout/success?gateway=razorpay&orderId=${order._id}`);
                } else {
                  toast.error("Payment verification failed", { id: verifyToast });
                }
              } catch (verifyErr) {
                toast.error(
                  verifyErr.response?.data?.message || "Payment verification failed",
                  { id: verifyToast }
                );
              }
            },
            prefill: {
              name: selectedAddr.name || user?.name || "",
              email: user?.email || "",
              contact: selectedAddr.phone || user?.mobile || ""
            },
            notes: {
              internalOrderId: order._id,
              orderNumber: orderNumber || order.orderNumber
            },
            theme: { color: "#111111" },
            modal: {
              ondismiss: () => {
                toast.error("Payment cancelled. Your order is saved as pending — you can retry from Profile.");
              }
            }
          };

          const rzp = new RazorpayCheckout(options);
          rzp.on("payment.failed", (response) => {
            toast.error(response?.error?.description || "Razorpay payment failed");
          });
          rzp.open();
          toast.dismiss(loadId);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Checkout failed. Try again.", { id: loadId });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Pricing math helper
  const walletDeducted = useWallet ? (walletBalance >= total ? total : walletBalance) : 0;
  const netPayable = total - walletDeducted;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors min-h-[70vh]">
        <div className="border-b border-zinc-100 pb-6 dark:border-zinc-900 mb-8">
          <h1 className="text-xl font-extrabold uppercase tracking-wider">Secure Checkout</h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1">
            Pay securely with Razorpay (UPI, cards, netbanking) or choose Cash on Delivery
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* STEP FIELDS */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* 1. SHIPPING ADDRESS */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <IoLocationOutline className="text-lg" /> 1. Shipping Address
                </h3>
                {!showAddressForm && (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="text-[10px] font-bold text-zinc-900 dark:text-white hover:underline uppercase"
                  >
                    + Add New Address
                  </button>
                )}
              </div>

              {showAddressForm ? (
                <form onSubmit={handleSubmit(onAddressSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <p className="text-[11px] leading-relaxed text-zinc-500">
                      Optional: allow location so we can autofill your address. We do not force this — you can type everything manually. You can edit autofilled fields before saving.
                    </p>
                    <button
                      type="button"
                      onClick={useLiveLocation}
                      disabled={locating}
                      className="btn-press mt-3 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                      <IoNavigateOutline />
                      {locating ? "Detecting…" : "Use My Live Location"}
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Full Name *</label>
                    <input {...register("name", { required: true })} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Mobile Number *</label>
                    <input type="tel" placeholder="10-digit mobile" {...register("phone", { required: true })} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900" />
                    {errors.phone && <p className="mt-1 text-[10px] text-red-500">Required</p>}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">House / Flat No.</label>
                    <input {...register("houseNo")} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Street / Area *</label>
                    <input {...register("street", { required: true })} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Landmark</label>
                    <input {...register("landmark")} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">City *</label>
                    <input {...register("city", { required: true })} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">State *</label>
                    <input {...register("state", { required: true })} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">Country *</label>
                    <input {...register("country", { required: true })} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5 block">PIN Code *</label>
                    <input {...register("zipCode", { required: true })} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-semibold outline-none focus:border-black dark:border-zinc-800 dark:bg-zinc-900" />
                  </div>
                  <input type="hidden" {...register("latitude")} />
                  <input type="hidden" {...register("longitude")} />

                  <div className="sm:col-span-2 flex gap-3 mt-2">
                    <button type="submit" className="rounded-xl bg-black px-6 py-2.5 text-xs font-bold text-white dark:bg-white dark:text-black">
                      Save Address
                    </button>
                    <button type="button" onClick={() => setShowAddressForm(false)} className="rounded-xl border border-zinc-200 px-6 py-2.5 text-xs font-bold text-zinc-500 dark:border-zinc-800">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : addresses.length === 0 ? (
                <div className="border border-dashed border-zinc-150 rounded-xl p-8 text-center dark:border-zinc-850">
                  <p className="text-xs text-zinc-400">No saved addresses found. Please add a shipping destination to continue.</p>
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="mt-4 rounded-xl bg-black px-6 py-2 text-xs font-bold text-white dark:bg-white dark:text-black"
                  >
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {addresses.map((addr) => (
                    <label
                      key={addr._id}
                      className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${selectedAddressId === addr._id ? "border-black dark:border-white bg-zinc-50/50 dark:bg-zinc-900/10" : "border-zinc-100 dark:border-zinc-900"}`}
                    >
                      <input
                        type="radio"
                        name="addressSelection"
                        checked={selectedAddressId === addr._id}
                        onChange={() => setSelectedAddressId(addr._id)}
                        className="mt-1 border-zinc-300 text-black focus:ring-0 dark:bg-zinc-900"
                      />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 dark:text-white">{addr.name}</span>
                          {addr.isDefault && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500 dark:bg-zinc-900">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                          {[addr.houseNo, addr.street, addr.landmark].filter(Boolean).join(", ")}, {addr.city}, {addr.state} - {addr.zipCode}
                          {addr.country ? `, ${addr.country}` : ""}
                        </p>
                        <p className="text-zinc-400 dark:text-zinc-500 mt-0.5">Phone: {addr.phone}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 2. WALLET PREFERENCE */}
            {walletBalance > 0 && (
              <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <IoWalletOutline className="text-lg" /> 2. Pay With Store Wallet
                </h3>
                <label className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl cursor-pointer dark:border-zinc-900">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="rounded border-zinc-300 text-black focus:ring-0 dark:bg-zinc-900"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-zinc-900 dark:text-white">Use Store Wallet Balance</p>
                      <p className="text-zinc-400 dark:text-zinc-500 mt-0.5">Available Balance: ₹{walletBalance}</p>
                    </div>
                  </div>
                  {useWallet && (
                    <span className="text-xs font-extrabold text-green-600">-₹{walletDeducted}</span>
                  )}
                </label>
              </div>
            )}

            {/* 3. PAYMENT METHOD */}
            {netPayable > 0 && (
              <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <IoCardOutline className="text-lg" /> 3. Select Payment Method
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Razorpay — default / primary */}
                  <label
                    className={`flex flex-col items-center gap-3 p-4 border rounded-xl cursor-pointer text-center transition-all ${paymentMethod === "Razorpay" ? "border-black dark:border-white bg-zinc-50/50 dark:bg-zinc-900/10 ring-1 ring-black/10 dark:ring-white/10" : "border-zinc-100 dark:border-zinc-900"}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "Razorpay"}
                      onChange={() => setPaymentMethod("Razorpay")}
                      className="sr-only"
                    />
                    <IoPhonePortraitOutline className="text-2xl text-zinc-500" />
                    <span className="text-xs font-bold">Razorpay</span>
                    <span className="text-[10px] text-zinc-400 font-medium">UPI · Cards · Netbanking · Wallets</span>
                  </label>

                  {/* COD */}
                  <label
                    className={`flex flex-col items-center gap-3 p-4 border rounded-xl cursor-pointer text-center transition-all ${paymentMethod === "COD" ? "border-black dark:border-white bg-zinc-50/50 dark:bg-zinc-900/10" : "border-zinc-100 dark:border-zinc-900"}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                      className="sr-only"
                    />
                    <IoCashOutline className="text-2xl text-zinc-500" />
                    <span className="text-xs font-bold">Cash On Delivery</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Pay when your order arrives</span>
                  </label>
                </div>
              </div>
            )}

          </div>

          {/* CHECKOUT SIDEBAR SUMMARY */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950/40">
              <h3 className="text-xs font-bold uppercase tracking-wider border-b border-zinc-100 pb-4 dark:border-zinc-900 mb-4">
                Order Review
              </h3>

              {/* Items recap */}
              <div className="flex flex-col gap-3.5 mb-5 max-h-48 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item._id} className="flex gap-3 text-xs font-semibold">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.product?.images?.[0]} alt="" className="h-10 w-8 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="truncate">{item.product?.title}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Qty: {item.quantity} | Size: {item.size}</p>
                    </div>
                    <span>₹{item.product?.salePrice * item.quantity}</span>
                  </div>
                ))}
              </div>

              <hr className="border-zinc-100 dark:border-zinc-900 my-4" />

              {/* Price Details */}
              <div className="flex flex-col gap-3.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Bag Subtotal</span>
                  <span className="text-zinc-900 dark:text-white">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (GST 18%)</span>
                  <span className="text-zinc-900 dark:text-white">₹{gst}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Charges</span>
                  <span className="text-zinc-900 dark:text-white">{shipping === 0 ? "Free" : `₹${shipping}`}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount ({coupon?.code})</span>
                    <span>-₹{couponDiscount}</span>
                  </div>
                )}
                {useWallet && walletDeducted > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Wallet Deducted</span>
                    <span>-₹{walletDeducted}</span>
                  </div>
                )}

                <hr className="border-zinc-100 dark:border-zinc-900 my-2" />

                <div className="flex justify-between text-sm font-extrabold text-zinc-900 dark:text-white">
                  <span>Amount to Pay</span>
                  <span>₹{netPayable}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className="mt-6 w-full rounded-full bg-black py-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
              >
                <IoCheckmarkCircleOutline className="text-base" />
                {isPlacingOrder
                  ? "Processing..."
                  : netPayable === 0
                    ? "Pay via Wallet & Confirm"
                    : paymentMethod === "Razorpay"
                      ? `Pay ₹${netPayable} with Razorpay`
                      : `Place COD Order · ₹${netPayable}`}
              </button>
            </div>
          </div>

        </div>

      </main>
      <Footer />
    </>
  );
};

export default CheckoutPage;
