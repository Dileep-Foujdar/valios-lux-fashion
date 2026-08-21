# Valios Lux Fashion — Backend API Documentation

> **Mobile App ke liye complete API reference**
> Base URL: `http://valios-lux-fashion.vercel.app/api` (production mein apna server URL use karein)

---

## 🔐 Authentication

Sab protected endpoints ke liye **Bearer Token** ya **Cookie** use hota hai.

```
Authorization: Bearer <accessToken>
```

> **Note:** Login ke baad `token` (accessToken) aur `refreshToken` milega. Mobile app mein dono ko store karo (e.g., Secure Storage / Keychain).

**Token Expiry:**
- Access Token: `1 day`
- Refresh Token: `7 days`

---

## 📋 Table of Contents

1. [Auth APIs](#1-auth-apis)
2. [User / Profile APIs](#2-user--profile-apis)
3. [Product APIs](#3-product-apis)
4. [Catalog APIs](#4-catalog-apis)
5. [Cart APIs](#5-cart-apis)
6. [Wishlist & Likes APIs](#6-wishlist--likes-apis)
7. [Order APIs](#7-order-apis)
8. [Payment APIs](#8-payment-apis)
9. [Review APIs](#9-review-apis)
10. [Coupon APIs](#10-coupon-apis)
11. [Delivery Partner APIs](#11-delivery-partner-apis)
12. [Admin APIs](#12-admin-apis)
13. [Upload APIs](#13-upload-apis)
14. [Socket.io Events](#14-socketio-events)

---

## 1. Auth APIs

**Base Path:** `/api/auth`

---

### 1.1 Check Email
Check karo ki email already registered hai ya nahi.

```
GET /api/auth/check-email?email=user@example.com
```

**Query Params:**
| Param | Type | Required |
|-------|------|----------|
| email | string | Yes |

**Response:**
```json
{
  "success": true,
  "exists": false,
  "mode": "register"
}
```
> `mode` = `"login"` ya `"register"` hoga

---

### 1.2 Request OTP
OTP send karo (login ya register ke liye).

```
POST /api/auth/otp/request
```

**Request Body (Login):**
```json
{
  "email": "user@example.com",
  "purpose": "login"
}
```

**Request Body (Register):**
```json
{
  "email": "user@example.com",
  "purpose": "register",
  "name": "Ramesh Kumar",
  "mobile": "9876543210",
  "location": {
    "permission": "granted",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "accuracy": 10,
    "city": "Delhi"
  }
}
```

> **location object options:**
> - `permission`: `"granted"` (GPS available) | `"denied"` | `"manual"` (city manually enter ki)
> - GPS mila ho toh `latitude`, `longitude` do
> - GPS nahi mila toh sirf `city` ya `address` do

**Response:**
```json
{
  "success": true,
  "purpose": "register",
  "message": "OTP sent to user@example.com",
  "otp": "123456"
}
```
> `otp` field sirf **development** mein aata hai, production mein nahi aata.

---

### 1.3 Verify OTP (Login / Register Complete)
OTP verify karo — login ya account create hoga.

```
POST /api/auth/otp/verify
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "token": "<accessToken>",
  "refreshToken": "<refreshToken>",
  "user": {
    "_id": "...",
    "name": "Ramesh Kumar",
    "email": "user@example.com",
    "mobile": "9876543210",
    "role": "Customer",
    "walletBalance": 0,
    "referralCode": "RAM123",
    "cart": [],
    "wishlist": [],
    "notifications": { "permission": "default", "enabled": false },
    "location": { "permission": "granted", "latitude": 28.6139, "longitude": 77.2090 },
    "permissionsOnboardingCompleted": false
  }
}
```

---

### 1.4 Login with Password
Password se login karo (agar set hai).

```
POST /api/auth/password/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

**Response:** Same as OTP Verify response

---

### 1.5 Google Login
Google OAuth se login (sirf existing users ke liye).

```
POST /api/auth/google-login
```

**Request Body:**
```json
{
  "email": "user@gmail.com",
  "name": "Ramesh Kumar"
}
```

**Response:** Same as OTP Verify response

---

### 1.6 Refresh Access Token

```
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "<refreshToken>"
}
```

**Response:**
```json
{
  "success": true,
  "token": "<newAccessToken>",
  "refreshToken": "<newRefreshToken>"
}
```

---

### 1.7 Logout

```
POST /api/auth/logout
```
> Cookies clear hoti hain. Mobile app mein local token bhi delete karo.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 1.8 Get Current User
**Auth Required**

```
GET /api/auth/me
```

**Response:**
```json
{
  "success": true,
  "user": { "...fullUserObject" : "..." }
}
```

---

## 2. User / Profile APIs

**Base Path:** `/api/users`
> Sab routes Auth Required hain

---

### 2.1 Get Profile

```
GET /api/users/profile
```

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "...",
    "name": "Ramesh Kumar",
    "email": "user@example.com",
    "mobile": "9876543210",
    "addresses": [],
    "cart": [
      {
        "product": { "_id": "...", "title": "...", "images": [], "salePrice": 999 },
        "quantity": 2,
        "color": "Red",
        "size": "M"
      }
    ],
    "wishlist": [],
    "walletBalance": 500,
    "referralCode": "RAM123"
  }
}
```

---

### 2.2 Update Profile

```
PUT /api/users/profile
```

**Request Body (koi bhi field bhejo):**
```json
{
  "name": "Ramesh Kumar",
  "email": "newemail@example.com",
  "mobile": "9876543210"
}
```

---

### 2.3 Update Permissions (Post-Login Onboarding)

```
PUT /api/users/permissions
```

**Request Body:**
```json
{
  "mobile": "9876543210",
  "notifications": {
    "permission": "granted",
    "enabled": true
  },
  "location": {
    "permission": "granted",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "accuracy": 10,
    "city": "Delhi"
  },
  "completeOnboarding": true
}
```

---

### 2.4 Reverse Geocode (Lat/Long se Address)

```
POST /api/users/geocode/reverse
```

**Request Body:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

**Response:**
```json
{
  "success": true,
  "address": {
    "city": "Delhi",
    "state": "Delhi",
    "country": "India",
    "formatted": "Connaught Place, Delhi, India"
  }
}
```

---

### 2.5 Add Address

```
POST /api/users/address
```

**Request Body:**
```json
{
  "name": "Ramesh Kumar",
  "phone": "9876543210",
  "houseNo": "A-42",
  "street": "MG Road",
  "landmark": "Near City Mall",
  "city": "Delhi",
  "state": "Delhi",
  "zipCode": "110001",
  "country": "India",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "isDefault": true
}
```

**Required Fields:** `name`, `phone`, `street`, `city`, `state`, `zipCode`

**Response:**
```json
{
  "success": true,
  "message": "Address added successfully",
  "addresses": []
}
```

---

### 2.6 Delete Address

```
DELETE /api/users/address/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Address deleted successfully",
  "addresses": []
}
```

---

### 2.7 Get Wallet & Referrals

```
GET /api/users/wallet-referrals
```

**Response:**
```json
{
  "success": true,
  "walletBalance": 500,
  "referralCode": "RAM123",
  "referredCount": 3,
  "referredUsers": [
    { "name": "Suresh", "email": "s@example.com", "role": "Customer", "createdAt": "..." }
  ]
}
```

---

## 3. Product APIs

**Base Path:** `/api/products`

---

### 3.1 Get All Products (with Filters)
**Public — No Auth Required**

```
GET /api/products
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| search | string | Title, brand, SKU, description search |
| category | string | Category ID ya name |
| subcategory | string | Subcategory name |
| brand | string | Brand name (comma-separated for multiple) |
| minPrice | number | Min sale price |
| maxPrice | number | Max sale price |
| color | string | Color (comma-separated) |
| size | string | Size (comma-separated) |
| rating | number | Minimum rating |
| featured | boolean | Only featured products (`true`) |
| trending | boolean | Only trending products |
| bestSeller | boolean | Only bestsellers |
| newArrival | boolean | Only new arrivals |
| offerProduct | boolean | Products on offer |
| hasDiscount | boolean | Products with discount |
| minDiscount | number | Min discount percentage |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| sort | string | Sort field (e.g., `salePrice`, `-createdAt`) |

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "pages": 5,
  "products": [
    {
      "_id": "...",
      "title": "Valios Silk Kurta",
      "description": "...",
      "sku": "VSK001",
      "mrp": 2999,
      "salePrice": 1999,
      "brand": "Valios",
      "category": { "_id": "...", "name": "Kurtas" },
      "subcategory": "Silk",
      "images": ["url1", "url2"],
      "colors": ["Red", "Blue"],
      "sizes": ["S", "M", "L", "XL"],
      "stock": 25,
      "rating": 4.2,
      "reviewCount": 15,
      "featured": true,
      "trending": false,
      "bestSeller": true,
      "newArrival": false
    }
  ]
}
```

---

### 3.2 Get Product by ID
**Public**

```
GET /api/products/:id
```

---

### 3.3 Get All Categories
**Public**

```
GET /api/products/categories
```

**Response:**
```json
{
  "success": true,
  "categories": [
    {
      "_id": "...",
      "name": "Kurtas",
      "slug": "kurtas",
      "subcategories": ["Silk", "Cotton", "Anarkali"]
    }
  ]
}
```

---

### 3.4 Get Brands & Stats
**Public**

```
GET /api/products/brands-stats
```

---

## 4. Catalog APIs

**Base Path:** `/api/catalog`

---

### 4.1 Get Catalog Items (Banners, Sliders, etc.)
**Public**

```
GET /api/catalog/items
```

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "_id": "...",
      "type": "banner",
      "title": "Summer Sale",
      "imageUrl": "https://...",
      "linkUrl": "/products?offerProduct=true",
      "isEnabled": true,
      "order": 1
    }
  ]
}
```

---

### 4.2 Get Categories
**Public**

```
GET /api/catalog/categories
```

---

## 5. Cart APIs

**Base Path:** `/api/users`
> **Auth Required**

---

### 5.1 Get Cart

```
GET /api/users/cart
```

**Response:**
```json
{
  "success": true,
  "cart": [
    {
      "_id": "cartItemId",
      "product": {
        "_id": "...",
        "title": "Valios Silk Kurta",
        "images": ["..."],
        "salePrice": 1999,
        "mrp": 2999,
        "stock": 25,
        "brand": "Valios"
      },
      "quantity": 2,
      "color": "Red",
      "size": "M"
    }
  ]
}
```

---

### 5.2 Add to Cart

```
POST /api/users/cart
```

**Request Body:**
```json
{
  "productId": "...",
  "quantity": 1,
  "color": "Red",
  "size": "M"
}
```

> Agar same product + color + size already cart mein hai, toh quantity add hogi.

---

### 5.3 Update / Remove Cart Item

```
PUT /api/users/cart/:itemId
```

**Request Body:**
```json
{
  "quantity": 3
}
```

> `quantity` = 0 ya less doge toh item cart se remove ho jayega.

---

## 6. Wishlist & Likes APIs

**Base Path:** `/api/users`
> **Auth Required**

---

### 6.1 Toggle Wishlist (Add / Remove)

```
POST /api/users/wishlist
```

**Request Body:**
```json
{
  "productId": "..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product added to wishlist",
  "wishlist": ["productId1", "productId2"]
}
```

---

### 6.2 Toggle Like (Add / Remove)

```
POST /api/users/like
```

**Request Body:**
```json
{
  "productId": "..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product liked",
  "likes": ["productId1"]
}
```

---

## 7. Order APIs

**Base Path:** `/api/orders`
> **Auth Required**

---

### 7.1 Create Order

```
POST /api/orders
```

**Request Body:**
```json
{
  "items": [
    {
      "product": "productId",
      "quantity": 2,
      "color": "Red",
      "size": "M"
    }
  ],
  "shippingAddress": {
    "name": "Ramesh Kumar",
    "phone": "9876543210",
    "houseNo": "A-42",
    "street": "MG Road",
    "landmark": "Near Mall",
    "city": "Delhi",
    "state": "Delhi",
    "zipCode": "110001",
    "country": "India"
  },
  "paymentMethod": "COD",
  "couponCode": "SAVE10",
  "useWallet": true
}
```

**`paymentMethod` options:** `"COD"` | `"Razorpay"` | `"Stripe"`

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "_id": "...",
    "orderNumber": "ORD-17234567891234",
    "orderStatus": "Pending",
    "paymentStatus": "Pending",
    "paymentMethod": "COD",
    "pricing": {
      "subtotal": 3998,
      "gst": 720,
      "shipping": 0,
      "couponDiscount": 400,
      "total": 4318
    },
    "items": [],
    "shippingAddress": {},
    "trackingHistory": [
      { "status": "Pending", "message": "Order placed successfully", "timestamp": "..." }
    ]
  },
  "walletDeducted": 200,
  "amountToPay": 4118
}
```

---

### 7.2 Get My Orders

```
GET /api/orders/my
```

**Response:**
```json
{
  "success": true,
  "orders": []
}
```

---

### 7.3 Get Order by ID

```
GET /api/orders/:id
```

**Response:**
```json
{
  "success": true,
  "order": {
    "_id": "...",
    "orderNumber": "...",
    "customer": { "name": "Ramesh", "email": "...", "mobile": "..." },
    "orderStatus": "Confirmed",
    "paymentStatus": "Paid",
    "pricing": {},
    "items": [],
    "trackingHistory": [],
    "deliveryPartner": { "name": "Suresh", "mobile": "..." }
  }
}
```

---

### 7.4 Cancel Order

```
PUT /api/orders/:id/cancel
```

**Request Body (optional):**
```json
{
  "reason": "Changed my mind"
}
```

> Sirf `Pending` ya `Confirmed` status mein cancel ho sakta hai.
> Payment refund wallet mein aayega.

---

### 7.5 Return / Replace Order

```
PUT /api/orders/:id/return
```

**Request Body:**
```json
{
  "action": "Return",
  "reason": "Size was wrong"
}
```

> `action` options: `"Return"` | `"Replace"`
> Sirf `Delivered` orders ke liye allowed hai.

---

### 7.6 Get Order Messages (Chat)

```
GET /api/orders/:id/messages
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "_id": "...",
      "order": "orderId",
      "sender": { "name": "Ramesh", "role": "Customer" },
      "message": "Where is my order?",
      "timestamp": "..."
    }
  ]
}
```

---

### 7.7 Send Order Message (Chat)

```
POST /api/orders/:id/messages
```

**Request Body:**
```json
{
  "message": "Where is my order?"
}
```

---

## 8. Payment APIs

**Base Path:** `/api/payments`
> **Auth Required**

**Flow for Online Payment:**
1. `POST /api/orders` → order banao (paymentMethod = "Razorpay" ya "Stripe")
2. `POST /api/payments/razorpay` ya `/stripe` → payment gateway se checkout URL/data lo
3. User payment kare
4. `POST /api/payments/verify` → payment verify karo

---

### 8.1 Process Razorpay Payment

```
POST /api/payments/razorpay
```

**Request Body:**
```json
{
  "orderId": "<mongoOrderId>"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "live",
  "keyId": "rzp_live_xxx",
  "amount": 431800,
  "currency": "INR",
  "orderId": "order_xxx",
  "internalOrderId": "...",
  "orderNumber": "ORD-..."
}
```

> `amount` paise mein hota hai (rupees x 100)

---

### 8.2 Process Stripe Payment

```
POST /api/payments/stripe
```

**Request Body:**
```json
{
  "orderId": "<mongoOrderId>"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "live",
  "url": "https://checkout.stripe.com/pay/..."
}
```

---

### 8.3 Verify Payment
Payment complete hone ke baad call karo.

```
POST /api/payments/verify
```

**Request Body (Razorpay):**
```json
{
  "gateway": "razorpay",
  "orderId": "<mongoOrderId>",
  "razorpayPaymentId": "pay_xxx",
  "razorpayOrderId": "order_xxx",
  "razorpaySignature": "signature_from_razorpay_sdk"
}
```

**Request Body (Stripe):**
```json
{
  "gateway": "stripe",
  "orderId": "<mongoOrderId>",
  "stripeSessionId": "cs_xxx"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "order": { "...updatedOrder" : "..." }
}
```

---

## 9. Review APIs

**Base Path:** `/api/reviews`

---

### 9.1 Get Product Reviews
**Public**

```
GET /api/reviews/:productId
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "reviews": [
    {
      "_id": "...",
      "rating": 4,
      "comment": "Bahut acha product hai!",
      "images": [],
      "verifiedPurchase": true,
      "user": { "name": "Ramesh", "email": "...", "role": "Customer" },
      "replies": [
        { "user": { "name": "Admin", "role": "Admin" }, "comment": "Thank you!", "createdAt": "..." }
      ],
      "createdAt": "..."
    }
  ]
}
```

---

### 9.2 Get Review Summary
**Public**

```
GET /api/reviews/:productId/summary
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "averageRating": 4.2,
    "totalReviews": 15,
    "distribution": {
      "1": 0,
      "2": 1,
      "3": 2,
      "4": 5,
      "5": 7
    }
  }
}
```

---

### 9.3 Create / Update Review
**Auth Required**

```
POST /api/reviews
```

**Request Body:**
```json
{
  "productId": "...",
  "rating": 5,
  "comment": "Bahut acha product hai!",
  "images": ["imageUrl1"]
}
```

> Agar pehle review diya hai same product pe, toh update ho jayega.

---

### 9.4 Delete Review
**Auth Required** (Apna review delete kar sakte hain / Admin bhi)

```
DELETE /api/reviews/:id
```

---

## 10. Coupon APIs

**Base Path:** `/api/coupons`

---

### 10.1 Validate Coupon
**Auth Required**

```
POST /api/coupons/validate
```

**Request Body:**
```json
{
  "code": "SAVE10",
  "cartSubtotal": 2000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Coupon applied successfully",
  "discount": 200,
  "coupon": {
    "code": "SAVE10",
    "discountType": "Percentage",
    "value": 10
  }
}
```

---

## 11. Delivery Partner APIs

**Base Path:** `/api/delivery`

---

### 11.1 Request Partner OTP
**Public**

```
POST /api/delivery/auth/otp/request
```

**Request Body:**
```json
{
  "email": "partner@example.com"
}
```

---

### 11.2 Verify Partner OTP
**Public**

```
POST /api/delivery/auth/otp/verify
```

**Request Body:**
```json
{
  "email": "partner@example.com",
  "code": "123456"
}
```

**Response (Existing Partner - Login):**
```json
{
  "success": true,
  "registered": true,
  "token": "<accessToken>",
  "refreshToken": "<refreshToken>",
  "user": {}
}
```

**Response (New Partner - Registration Required):**
```json
{
  "success": true,
  "registered": false,
  "registrationToken": "<tempToken>"
}
```

---

### 11.3 Register Partner
**Public** (registrationToken required)

```
POST /api/delivery/auth/register
```

**Request Body:**
```json
{
  "registrationToken": "<tempTokenFromOTPVerify>",
  "name": "Suresh Driver",
  "mobile": "9876543210",
  "vehicleType": "Bike",
  "vehicleNumber": "DL01AB1234",
  "aadhaarNumber": "1234-5678-9012",
  "panNumber": "ABCDE1234F",
  "bankAccount": "1234567890",
  "ifscCode": "SBIN0001234",
  "profilePhoto": "s3Url",
  "aadhaarPhoto": "s3Url"
}
```

---

### 11.4 Get Partner Profile
**Auth Required | Role: Delivery Partner**

```
GET /api/delivery/me
```

---

### 11.5 Update Partner Profile
**Auth Required | Role: Delivery Partner**

```
PUT /api/delivery/me
```

---

### 11.6 Get Dashboard Stats
**Auth Required | Role: Delivery Partner**

```
GET /api/delivery/dashboard
```

---

### 11.7 Get Available Delivery Offers
**Auth Required | Role: Delivery Partner**

```
GET /api/delivery/offers
```

---

### 11.8 Get My Assignments
**Auth Required | Role: Delivery Partner**

```
GET /api/delivery/assignments
```

---

### 11.9 Accept Assignment
**Auth Required | Role: Delivery Partner**

```
PUT /api/delivery/assignments/:id/accept
```

---

### 11.10 Reject Assignment
**Auth Required | Role: Delivery Partner**

```
PUT /api/delivery/assignments/:id/reject
```

---

### 11.11 Update Assignment Status
**Auth Required | Role: Delivery Partner**

```
PUT /api/delivery/assignments/:id/status
```

**Request Body:**
```json
{
  "status": "PickedUp"
}
```

---

### 11.12 Verify Delivery OTP (Mark as Delivered)
**Auth Required | Role: Delivery Partner**

```
PUT /api/delivery/deliver/:orderId
```

**Request Body:**
```json
{
  "otp": "123456"
}
```

---

### 11.13 Get Earnings
**Auth Required | Role: Delivery Partner**

```
GET /api/delivery/earnings
```

---

### 11.14 Get Assigned Orders (Legacy)
**Auth Required | Role: Delivery Partner**

```
GET /api/delivery/assigned
```

---

## 12. Admin APIs

**Base Path:** `/api/admin`
> Role Required: `Admin` | `Owner` | `Super Admin`

---

### 12.1 Get Website Settings
**Public** (Admin ko full settings milti hai)

```
GET /api/admin/settings
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "storeName": "Valios Lux Fashion",
    "logo": "...",
    "deliveryCharges": {
      "defaultCharge": 99,
      "minAmountForFreeDelivery": 999
    },
    "taxPercentage": {
      "gst": 18
    },
    "contactEmail": "...",
    "socialLinks": {}
  }
}
```

---

### 12.2 Get Dashboard Stats
**Admin Only**

```
GET /api/admin/stats
```

---

### 12.3 Update Website Settings
**Admin Only**

```
PUT /api/admin/settings
```

---

### 12.4 Get All Users
**Admin Only**

```
GET /api/admin/users
```

---

### 12.5 Update User Role / Status
**Admin Only**

```
PUT /api/admin/users/:id
```

**Request Body:**
```json
{
  "role": "Admin",
  "isActive": true
}
```

---

### 12.6 Get All Delivery Partners
**Admin Only**

```
GET /api/admin/delivery/partners
```

---

### 12.7 Get Single Delivery Partner
**Admin Only**

```
GET /api/admin/delivery/partners/:id
```

---

### 12.8 Update Delivery Partner Status
**Admin Only**

```
PUT /api/admin/delivery/partners/:id
```

**Request Body:**
```json
{
  "status": "Approved"
}
```

---

### 12.9 Get Delivery Overview
**Admin Only**

```
GET /api/admin/delivery/overview
```

---

### 12.10 Get All Delivery Assignments
**Admin Only**

```
GET /api/admin/delivery/assignments
```

---

### 12.11 Create Delivery Offer
**Admin Only**

```
POST /api/admin/delivery/offers
```

---

### 12.12 Get All Orders
**Admin / Delivery Partner**

```
GET /api/orders
```

---

### 12.13 Update Order Status
**Admin / Delivery Partner**

```
PUT /api/orders/:id/status
```

**Request Body:**
```json
{
  "status": "Shipped",
  "deliveryPartnerId": "<userId>"
}
```

**Order Status Values:**
`Pending` → `Confirmed` → `Processing` → `Shipped` → `OutForDelivery` → `Delivered`
or `Cancelled` | `Returned` | `Replaced`

---

## 13. Upload APIs

**Base Path:** `/api/uploads`
> **Admin Only**

---

### 13.1 Get Presigned Upload URL (S3)

```
POST /api/uploads/presign
```

**Request Body:**
```json
{
  "fileName": "product-image.jpg",
  "contentType": "image/jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "uploadUrl": "https://s3.amazonaws.com/presigned-url...",
  "publicUrl": "https://cdn.example.com/product-image.jpg"
}
```

**Upload Flow:**
1. Pehle presigned URL lo
2. Directly S3 pe file PUT karo us URL pe
3. `publicUrl` apne product/profile mein use karo

---

### 13.2 Delete Uploaded File
**Admin Only**

```
DELETE /api/uploads
```

---

## 14. Socket.io Events

Server URL: `http://localhost:5000` (ya production URL)

**Connect karo:**
```javascript
import io from 'socket.io-client';

const socket = io("http://localhost:5000");

// Login ke baad join karo
socket.emit("join", { userId: "userId123", role: "Customer" });
```

---

### Events — Customer App

| Event | Direction | Data | Description |
|-------|-----------|------|-------------|
| `join` | Emit | `{ userId, role }` | Room join karo login ke baad |
| `joinOrderChat` | Emit | `{ orderId }` | Order chat room join karo |
| `leaveOrderChat` | Emit | `{ orderId }` | Order chat room leave karo |
| `joinOrderTracking` | Emit | `{ orderId }` | Live delivery tracking shuru karo |
| `newChatMessage` | Listen | Message object | Order mein naya message aaya |
| `supportChatMessage` | Listen | Message object | Admin ne message bheja |
| `locationUpdated` | Listen | `{ latitude, longitude }` | Delivery partner ka live location |

---

### Events — Delivery Partner App

| Event | Direction | Data | Description |
|-------|-----------|------|-------------|
| `join` | Emit | `{ userId, role: "Delivery Partner" }` | Room join karo |
| `updateLocation` | Emit | `{ orderId, latitude, longitude }` | Customer ko live location bhejo |

---

### Events — Admin Panel

| Event | Direction | Data | Description |
|-------|-----------|------|-------------|
| `join` | Emit | `{ userId, role: "Admin" }` | Admin room join karo |
| `newOrder` | Listen | `{ orderNumber, customer, total }` | Naya order aaya |
| `customerChatMessage` | Listen | Message object | Customer ne order mein message bheja |

---

## Standard Error Responses

```json
{
  "success": false,
  "message": "Error description here",
  "code": "TOKEN_EXPIRED"
}
```

**Common HTTP Status Codes:**
| Code | Matlab |
|------|--------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (Invalid data) |
| 401 | Unauthorized (Login required) |
| 403 | Forbidden (Role not allowed) |
| 404 | Not Found |
| 409 | Conflict (Already exists) |
| 429 | Too Many Requests (Rate limited) |
| 500 | Server Error |

**Token Expired Handle karna:**
```
code: "TOKEN_EXPIRED" mile toh →
  1. POST /api/auth/refresh call karo
  2. Naya token mile toh original request retry karo
  3. Refresh bhi fail ho toh → User ko logout karo
```

---

## User Roles

| Role | Access |
|------|--------|
| `Customer` | Shopping, orders, cart, wishlist, reviews |
| `Delivery Partner` | Assigned deliveries, location tracking |
| `Admin` | Products, orders, users, coupons manage |
| `Owner` | Full admin access + settings |
| `Super Admin` | Maximum level access |

---

## Environment Setup (Backend)

```env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=1d
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRE=7d
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
FRONTEND_URL=https://yourapp.com
```
