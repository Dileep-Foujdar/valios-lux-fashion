# Kirnya API Reference (Mobile + Web Client Contract)

> **Base URL (prod):** `https://valios-lux-fashion.vercel.app/api`  
> **Base URL (local):** `http://localhost:5000/api`  
> Auth: `Authorization: Bearer <accessToken>`  
> Errors: `{ "success": false, "message": "...", "code": "OPTIONAL_CODE" }`  
> Booleans in query/body: accept `true` | `"true"` | `1` | `"yes"`

---

## 1. Auth — `/auth`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/auth/check-email?email=` | No | `{ exists, mode: login\|register }` |
| POST | `/auth/otp/request` | No | body: `{ email, purpose, name?, mobile?, location? }` |
| POST | `/auth/otp/verify` | No | → `{ token, refreshToken, user }` |
| GET | `/auth/me` | Yes | Current user |
| POST | `/auth/refresh` | Cookie/body | New access token |
| POST | `/auth/logout` | Yes | Clears session |
| POST | `/auth/google-login` | No | Client-ready |
| POST | `/auth/password/login` | No | Admin/password flows |

---

## 2. Products — `/products`

### List
`GET /products`

**Query**
| Param | Example | Behaviour |
|-------|---------|-----------|
| `search` / `q` | `zara` | title, brand, sku, tags |
| `category` | slug / id / name | |
| `brand` | `Zara,H&M` | comma list |
| `minPrice` `maxPrice` | | filters `salePrice` |
| `color` `size` | | |
| `rating` | `4` | min rating |
| `featured` | `true` \| `1` \| `yes` | |
| `newArrival` / `latest` | `true` | `newArrival OR latest` |
| `trending` `bestSeller` `offerProduct` | | |
| `hasDiscount` `minDiscount` | | |
| `stockStatus` | `in_stock` | |
| `page` | `1` | **1-based** (never 0) |
| `limit` | `10` | max 100 |
| `sort` | see below | |

**Sort aliases**
```
salePrice | price | priceAsc | price-low     → ASC
-salePrice | -price | priceDesc | price-high → DESC
featured                                     → featured first, then rating
-createdAt | newest                          → newest first
rating | discount | sold | popular
```

**Response**
```json
{
  "success": true,
  "products": [],
  "count": 10,
  "total": 67,
  "page": 1,
  "pages": 7,
  "totalProducts": 67,
  "totalPages": 7,
  "currentPage": 1
}
```
> Prefer `total` / `page` / `pages`. Legacy keys kept for older web clients.

### Detail / related
| Method | Path |
|--------|------|
| GET | `/products/:id` → `{ product, relatedProducts }` |
| GET | `/products/:id/related?limit=6` |
| GET | `/products/categories` |
| GET | `/products/brands-stats` |

---

## 3. Catalog — `/catalog`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/catalog/items` | Home banners — use `linkUrl` as deep link |
| GET | `/catalog/categories` | |

---

## 4. User / Address / Cart — `/users`

| Method | Path | Notes |
|--------|------|-------|
| GET/PUT | `/users/profile` | Cart items always populated |
| PUT | `/users/permissions` | |
| POST | `/users/geocode/reverse` | `{ latitude, longitude }` |
| GET | `/users/pincode/:pin` | PIN → city/state |
| POST | `/users/address` | Create |
| PUT | `/users/address/:id` | Update |
| PUT | `/users/address/:id/default` | Set default |
| DELETE | `/users/address/:id` | |
| GET/POST | `/users/cart` | |
| PUT | `/users/cart/:itemId` | qty ≤ 0 removes |
| POST | `/users/wishlist` | toggle |
| POST | `/users/like` | toggle |
| GET | `/users/wallet-referrals` | |

### Reverse geocode response
```json
{
  "success": true,
  "address": {
    "houseNo": "12A",
    "street": "MG Road",
    "landmark": "...",
    "city": "Jaipur",
    "state": "Rajasthan",
    "zipCode": "302001",
    "country": "India",
    "formatted": "12A, MG Road, Jaipur, Rajasthan 302001",
    "displayName": "...",
    "latitude": 26.9,
    "longitude": 75.8
  }
}
```

### Cart item shape (always)
```json
{
  "_id": "cartItemId",
  "quantity": 1,
  "color": "Black",
  "size": "M",
  "product": {
    "_id": "...",
    "title": "...",
    "images": [],
    "salePrice": 1299,
    "mrp": 1999,
    "brand": "...",
    "stock": 5
  }
}
```

---

## 5. Orders — `/orders`

| Method | Path | Notes |
|--------|------|-------|
| **POST** | **`/orders/preview`** | Server GST/shipping — **display-only on client** |
| POST | `/orders` | Place order (`COD` \| `Razorpay` \| `Stripe`) |
| GET | `/orders/my` | |
| GET | `/orders/:id` | |
| PUT | `/orders/:id/cancel` | |
| PUT | `/orders/:id/return` | return/replace |

### Preview body
```json
{
  "items": [{ "product": "id", "quantity": 1, "color": "Black", "size": "M" }],
  "couponCode": "SAVE10",
  "useWallet": true
}
```
> Omit `items` to price the user’s current cart.

### Preview / create pricing
```json
{
  "success": true,
  "subtotal": 3299,
  "couponDiscount": 200,
  "gst": 557,
  "shipping": 0,
  "walletUsed": 0,
  "total": 3656,
  "pricing": { "subtotal": 3299, "couponDiscount": 200, "gst": 557, "shipping": 0, "walletUsed": 0, "total": 3656 }
}
```

---

## 6. Payments — `/payments`

| Method | Path |
|--------|------|
| POST | `/payments/razorpay` | Create RZP order for existing DB order |
| POST | `/payments/verify` | Verify payment signature |
| POST | `/payments/stripe` | Legacy/optional |

---

## 7. Coupons — `/coupons`

| Method | Path |
|--------|------|
| POST | `/coupons/validate` | `{ code, subtotal? }` |

---

## 8. Reviews — `/reviews`

| Method | Path |
|--------|------|
| GET | `/reviews/:productId` |
| GET | `/reviews/:productId/summary` |
| POST | `/reviews` | `{ productId, rating, comment }` |
| DELETE | `/reviews/:id` |

---

## 9. Delivery partner — `/delivery`

| Method | Path |
|--------|------|
| POST | `/delivery/auth/otp/request` |
| POST | `/delivery/auth/otp/verify` |
| POST | `/delivery/auth/register` |
| GET | `/delivery/dashboard` |
| GET | `/delivery/offers` |
| PUT | `/delivery/assignments/:id/accept` |
| PUT | `/delivery/assignments/:id/status` |
| GET/PUT | `/delivery/me` |

---

## 10. Admin (roles: Admin / Owner / Super Admin)

| Area | Paths |
|------|-------|
| Stats/settings/users | `/admin/stats`, `/admin/settings`, `/admin/users` |
| Delivery partners | `/admin/delivery/partners`, `/admin/delivery/offers`, `/admin/delivery/overview` |
| Products CRUD | `/products` (auth) |
| Uploads | `/uploads/presign` |

---

## Client integration notes

1. **Shop filters:** send `sort=salePrice` / `-salePrice`, `newArrival=true`, `featured=1` — no client-side re-sort needed.
2. **Pagination:** use `page` + `pages` + `total`; never assume page `0`.
3. **Checkout:** call `POST /orders/preview` before place; show those numbers; do not recalculate GST/shipping on device.
4. **Cart:** if `product` is missing, treat as purged — backend already strips deleted products.
5. **401:** refresh via `/auth/refresh`; if refresh fails, logout.
6. Set mobile `EXPO_PUBLIC_API_URL` to this base (no hardcode).

---

*Last updated: backend sprint — filters, pagination, geocode, cart populate, order preview, address update/default, pincode, related products.*
