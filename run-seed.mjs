import dotenv from "dotenv";
dotenv.config();
import dns from "dns";
import mongoose from "mongoose";
import crypto from "crypto";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (err) {
  // Ignore DNS override errors
}

const MONGODB_URI = process.env.MONGODB_URI;
await mongoose.connect(MONGODB_URI);
console.log("> Connected! DB:", mongoose.connection.name);

const { Schema, model, models } = mongoose;

const categorySchema = new Schema({ name: String, slug: String, image: String, subcategories: [String], isActive: { type: Boolean, default: true } }, { timestamps: true });
const Category = models.Category || model("Category", categorySchema);

const productSchema = new Schema({
  title: String, description: String, sku: String,
  mrp: Number, salePrice: Number, brand: String,
  rating: Number, reviewCount: Number,
  specifications: [{ name: String, value: String }],
  colors: [String], sizes: [String],
  images: [String], videoUrl: String, view360Images: [String],
  stock: Number,
  category: { type: Schema.Types.ObjectId, ref: "Category" },
  subcategory: String, tags: [String],
  featured: Boolean, trending: Boolean, bestSeller: Boolean,
  latest: Boolean, newArrival: Boolean, offerProduct: Boolean,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
const Product = models.Product || model("Product", productSchema);

const couponSchema = new Schema({
  code: { type: String, unique: true }, discountType: String, value: Number,
  minPurchase: Number, maxDiscount: Number, expiryDate: Date, isActive: { type: Boolean, default: true }
}, { timestamps: true });
const Coupon = models.Coupon || model("Coupon", couponSchema);

const userSchema = new Schema({
  name: String, email: { type: String, unique: true }, mobile: { type: String, unique: true },
  role: { type: String, default: "Customer" }, walletBalance: { type: Number, default: 0 },
  password: String, isActive: { type: Boolean, default: true }
}, { timestamps: true });
const User = models.User || model("User", userSchema);

const categoriesData = [
  { name: "Dresses & Gowns", slug: "dresses-gowns", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80", subcategories: ["Maxi Dresses", "Cocktail Dresses", "Bodycon Dresses", "Evening Gowns"] },
  { name: "Tops & Tees", slug: "tops-tees", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80", subcategories: ["Crop Tops", "Satin Blouses", "Casual Tees", "Shirts"] },
  { name: "Ethnic & Sarees", slug: "ethnic-sarees", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80", subcategories: ["Designer Sarees", "Anarkali Sets", "Lehengas", "Kurta Sets"] },
  { name: "Bottoms & Jeans", slug: "bottoms-jeans", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80", subcategories: ["High-Waist Jeans", "Wide Leg Trousers", "Skirts", "Palazzos"] },
  { name: "Jackets & Shrugs", slug: "jackets-shrugs", image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80", subcategories: ["Blazers", "Leather Jackets", "Cardigans", "Denim Jackets"] },
  { name: "Footwear & Heels", slug: "footwear-heels", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80", subcategories: ["Stiletto Heels", "Sandals", "Sneakers", "Flats"] },
  { name: "Bags & Accessories", slug: "bags-accessories", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80", subcategories: ["Handbags", "Clutches", "Tote Bags", "Sunglasses"] },
  { name: "Jewellery & Beauty", slug: "jewellery-beauty", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80", subcategories: ["Necklaces", "Earring Sets", "Lipsticks", "Perfumes"] }
];

const womenProductsData = [
  // Dresses & Gowns
  {
    title: "Gucci Floral Silk Chiffon Maxi Dress",
    description: "Elegant floor-length silk chiffon maxi dress with vibrant floral prints, delicate ruffle trims, and a cinched waistline. Designed for luxury summer galas and romantic evenings.",
    categoryName: "Dresses & Gowns", subcategory: "Maxi Dresses", brand: "Gucci", mrp: 4999, salePrice: 2999,
    colors: ["Pastel Pink", "Floral White"], sizes: ["XS", "S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 142
  },
  {
    title: "Prada Velvet Evening Cocktail Bodycon Dress",
    description: "Sophisticated black velvet bodycon dress featuring a sweetheart neckline, subtle side slit, and figure-hugging stretch silhouette. Perfect for evening cocktail parties.",
    categoryName: "Dresses & Gowns", subcategory: "Cocktail Dresses", brand: "Prada", mrp: 5999, salePrice: 3499,
    colors: ["Classic Black", "Emerald Green"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: false, rating: 4.8, reviewCount: 98
  },
  {
    title: "Vero Moda Satin Wrap A-Line Mini Dress",
    description: "Chic champagne satin wrap mini dress with long cuffed sleeves and a fluid tie-waist sash. Versatile for brunch celebrations and night outs.",
    categoryName: "Dresses & Gowns", subcategory: "Bodycon Dresses", brand: "Vero Moda", mrp: 2999, salePrice: 1699,
    colors: ["Champagne Gold", "Rose Red"], sizes: ["XS", "S", "M"],
    images: ["https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.7, reviewCount: 76
  },
  {
    title: "Mango Tiered Cotton Summer Sundress",
    description: "Breezy tiered cotton A-line sundress styled with adjustable spaghetti straps and feminine smocked bodice in pastel tones.",
    categoryName: "Dresses & Gowns", subcategory: "Maxi Dresses", brand: "Mango", mrp: 3199, salePrice: 1899,
    colors: ["Sky Blue", "Coral Orange"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: false, rating: 4.6, reviewCount: 64
  },
  {
    title: "Zara Pleated Metallic Evening Gown",
    description: "Breathtaking floor-clearing pleated metallic gown with deep V-neckline and open back silhouette.",
    categoryName: "Dresses & Gowns", subcategory: "Evening Gowns", brand: "Zara", mrp: 6499, salePrice: 3899,
    colors: ["Rose Gold", "Silver Metallic"], sizes: ["XS", "S", "M"],
    images: ["https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: false, bestSeller: true, rating: 4.9, reviewCount: 118
  },
  {
    title: "H&M Off-Shoulder Ruffle Midi Dress",
    description: "Flirty off-shoulder midi dress featuring tier ruffles, elasticated waist, and a playful thigh-high front slit.",
    categoryName: "Dresses & Gowns", subcategory: "Cocktail Dresses", brand: "H&M", mrp: 2799, salePrice: 1499,
    colors: ["Lilac Purple", "Sunflower Yellow"], sizes: ["S", "M", "L", "XL"],
    images: ["https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: false, rating: 4.5, reviewCount: 52
  },

  // Tops & Tees
  {
    title: "Mango Silk Satin Button-Down Blouse",
    description: "Luxurious silk-touch satin blouse featuring a relaxed fit, spread collar, and mother-of-pearl buttons. Pairs seamlessly with trousers and skirts.",
    categoryName: "Tops & Tees", subcategory: "Satin Blouses", brand: "Mango", mrp: 2499, salePrice: 1399,
    colors: ["Ivory White", "Lavender"], sizes: ["XS", "S", "M", "L", "XL"],
    images: ["https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: false, bestSeller: true, rating: 4.6, reviewCount: 110
  },
  {
    title: "Zara Ribbed Cotton Corset Crop Top",
    description: "Modern ribbed cotton crop top featuring a structured corset seam design and wide square neckline. A staple for trendsetting casual outfits.",
    categoryName: "Tops & Tees", subcategory: "Crop Tops", brand: "Zara", mrp: 1899, salePrice: 999,
    colors: ["Off White", "Black"], sizes: ["XS", "S", "M"],
    images: ["https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.5, reviewCount: 88
  },
  {
    title: "Only Floral Print Puff Sleeve Top",
    description: "Feminine floral top styled with voluminous puff sleeves, a ruched bust detailing, and lightweight breathable fabric.",
    categoryName: "Tops & Tees", subcategory: "Casual Tees", brand: "Only", mrp: 1999, salePrice: 1099,
    colors: ["Pastel Yellow", "Sky Blue"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: false, bestSeller: false, rating: 4.4, reviewCount: 45
  },
  {
    title: "Tommy Hilfiger Classic Cotton Polo Top",
    description: "Sporty yet sophisticated slim-fit cotton piqué polo featuring embroidered flag logo and mother-of-pearl buttons.",
    categoryName: "Tops & Tees", subcategory: "Shirts", brand: "Tommy Hilfiger", mrp: 2999, salePrice: 1799,
    colors: ["Navy Blue", "Crimson Red"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: false, bestSeller: true, rating: 4.7, reviewCount: 130
  },
  {
    title: "Vero Moda Lace Trim Satin Cami Top",
    description: "Delicate satin camisole accented with intricate scalloped eyelash lace around the neckline and adjustable shoulder straps.",
    categoryName: "Tops & Tees", subcategory: "Crop Tops", brand: "Vero Moda", mrp: 1799, salePrice: 899,
    colors: ["Black Lace", "Blush Pink"], sizes: ["XS", "S", "M"],
    images: ["https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: false, rating: 4.6, reviewCount: 59
  },
  {
    title: "H&M Oversized Graphic Fashion Tee",
    description: "Trendy 100% organic cotton oversized graphic tee featuring vintage typography and dropped shoulder sleeves.",
    categoryName: "Tops & Tees", subcategory: "Casual Tees", brand: "H&M", mrp: 1499, salePrice: 799,
    colors: ["Washed Grey", "Pure White"], sizes: ["S", "M", "L", "XL"],
    images: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.5, reviewCount: 145
  },

  // Ethnic & Sarees
  {
    title: "Tanishq Designer Organza Floral Saree with Blouse",
    description: "Breathtaking pastel pink organza saree decorated with delicate floral hand-embroidery and zardozi border work. Includes unstitched designer blouse piece.",
    categoryName: "Ethnic & Sarees", subcategory: "Designer Sarees", brand: "Tanishq", mrp: 7999, salePrice: 4499,
    colors: ["Blush Pink", "Mint Green"], sizes: ["Free Size"],
    images: ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 215
  },
  {
    title: "Giva Embroidered Anarkali Kurta & Pants Set",
    description: "Royal maroon Georgette Anarkali suit with gold zari embroidery work, matching trousers, and sheer net dupatta.",
    categoryName: "Ethnic & Sarees", subcategory: "Anarkali Sets", brand: "Giva", mrp: 6499, salePrice: 3699,
    colors: ["Maroon Red", "Royal Blue"], sizes: ["S", "M", "L", "XL"],
    images: ["https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: false, bestSeller: false, rating: 4.8, reviewCount: 64
  },
  {
    title: "Swarovski Velvet Bridal Lehenga Choli Set",
    description: "Exquisite velvet bridal lehenga lavishly crafted with intricate sequin embroideries, flared volume, and double net dupattas.",
    categoryName: "Ethnic & Sarees", subcategory: "Lehengas", brand: "Swarovski", mrp: 12999, salePrice: 7999,
    colors: ["Deep Red", "Wine Purple"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 5.0, reviewCount: 180
  },
  {
    title: "Manyavar Silk Chanderi Banarasi Saree",
    description: "Opulent royal blue Silk Chanderi Banarasi saree woven with gold brocade motifs and rich pallu finish.",
    categoryName: "Ethnic & Sarees", subcategory: "Designer Sarees", brand: "Manyavar", mrp: 8999, salePrice: 5199,
    colors: ["Royal Blue", "Golden Mustard"], sizes: ["Free Size"],
    images: ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 172
  },
  {
    title: "Biba Printed Cotton Chikankari Kurti Set",
    description: "Traditional white pure cotton Chikankari hand-embroidered kurti paired with cropped palazzo pants.",
    categoryName: "Ethnic & Sarees", subcategory: "Kurta Sets", brand: "Biba", mrp: 3499, salePrice: 1999,
    colors: ["Pure White", "Sky Blue"], sizes: ["S", "M", "L", "XL"],
    images: ["https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.7, reviewCount: 104
  },
  {
    title: "W for Woman Silk Blend Straight Kurta",
    description: "Contemporary silk blend straight kurta featuring boat neckline, three-quarter sleeves, and metallic foil prints.",
    categoryName: "Ethnic & Sarees", subcategory: "Kurta Sets", brand: "W for Woman", mrp: 2799, salePrice: 1599,
    colors: ["Teal Green", "Magenta Pink"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: false, bestSeller: false, rating: 4.6, reviewCount: 48
  },

  // Bottoms & Jeans
  {
    title: "Levi's High-Waisted Flare Denim Jeans",
    description: "Iconic high-waisted vintage denim jeans with an elongated bootcut flare hem. Stretch denim technology for all-day shape retention.",
    categoryName: "Bottoms & Jeans", subcategory: "High-Waist Jeans", brand: "Levi's", mrp: 3499, salePrice: 2199,
    colors: ["Indigo Blue", "Washed Black"], sizes: ["26", "28", "30", "32"],
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.7, reviewCount: 156
  },
  {
    title: "Zara Pleated High-Waist Wide Leg Trousers",
    description: "Sophisticated wide-leg tailored trousers with front pleats, slant pockets, and a clean hook-and-bar closure. Elevates power dressing.",
    categoryName: "Bottoms & Jeans", subcategory: "Wide Leg Trousers", brand: "Zara", mrp: 3299, salePrice: 1899,
    colors: ["Beige Tan", "Charcoal Grey"], sizes: ["XS", "S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: false, bestSeller: true, rating: 4.6, reviewCount: 92
  },
  {
    title: "Mango A-Line Faux Leather Mini Skirt",
    description: "Sleek buttery-soft faux leather mini skirt designed with an A-line cut and hidden rear zip closure.",
    categoryName: "Bottoms & Jeans", subcategory: "Skirts", brand: "Mango", mrp: 2799, salePrice: 1499,
    colors: ["Jet Black", "Burgundy"], sizes: ["XS", "S", "M"],
    images: ["https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: false, rating: 4.7, reviewCount: 84
  },
  {
    title: "Only Distressed Boyfriend Fit Denim Jeans",
    description: "Relaxed slouchy boyfriend fit jeans featuring light distressing details and high rise waist.",
    categoryName: "Bottoms & Jeans", subcategory: "High-Waist Jeans", brand: "Only", mrp: 2999, salePrice: 1699,
    colors: ["Light Wash Blue"], sizes: ["26", "28", "30"],
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.5, reviewCount: 110
  },
  {
    title: "Vero Moda High-Waist Utility Cargo Trousers",
    description: "Trendy utility cargo trousers tailored with spacious flap pockets and elasticated ankle cuffs.",
    categoryName: "Bottoms & Jeans", subcategory: "Palazzos", brand: "Vero Moda", mrp: 3199, salePrice: 1799,
    colors: ["Olive Khaki", "Sand Beige"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: false, bestSeller: false, rating: 4.6, reviewCount: 67
  },
  {
    title: "H&M Pleated Floral Chiffon Midi Skirt",
    description: "Flowy accordion pleated chiffon midi skirt decorated with romantic micro floral prints.",
    categoryName: "Bottoms & Jeans", subcategory: "Skirts", brand: "H&M", mrp: 2499, salePrice: 1299,
    colors: ["Navy Floral", "Pastel Cream"], sizes: ["XS", "S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.7, reviewCount: 95
  },

  // Jackets & Shrugs
  {
    title: "Tommy Hilfiger Tailored Double-Breasted Blazer",
    description: "Structured double-breasted blazer featuring sharp lapels, engraved gold crest buttons, and premium wool-blend lining.",
    categoryName: "Jackets & Shrugs", subcategory: "Blazers", brand: "Tommy Hilfiger", mrp: 5499, salePrice: 3299,
    colors: ["Navy Blue", "Camel Brown"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: false, rating: 4.8, reviewCount: 77
  },
  {
    title: "Zara Faux Leather Biker Jacket",
    description: "Edgy faux leather jacket styled with asymmetrical zip closure, metallic hardware buckles, and quilted shoulder panels.",
    categoryName: "Jackets & Shrugs", subcategory: "Leather Jackets", brand: "Zara", mrp: 4599, salePrice: 2699,
    colors: ["Jet Black", "Burgundy"], sizes: ["XS", "S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.7, reviewCount: 134
  },
  {
    title: "Mango Chunky Knit Oversized Cardigan",
    description: "Ultra-cozy cable knit cardigan with tortshell buttons and deep patch pockets.",
    categoryName: "Jackets & Shrugs", subcategory: "Cardigans", brand: "Mango", mrp: 3799, salePrice: 2199,
    colors: ["Cream Oatmeal", "Sage Green"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: false, bestSeller: true, rating: 4.8, reviewCount: 115
  },
  {
    title: "H&M Cropped Denim Trucker Jacket",
    description: "Classic rigid denim jacket updated with a modern cropped length and button-flap chest pockets.",
    categoryName: "Jackets & Shrugs", subcategory: "Denim Jackets", brand: "H&M", mrp: 2999, salePrice: 1599,
    colors: ["Medium Wash", "Vintage Black"], sizes: ["XS", "S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: false, rating: 4.5, reviewCount: 81
  },
  {
    title: "Vero Moda Classic Double-Breasted Trench Coat",
    description: "Timeless water-resistant trench coat styled with gunflap detail, waist tie belt, and storm flap back.",
    categoryName: "Jackets & Shrugs", subcategory: "Blazers", brand: "Vero Moda", mrp: 6999, salePrice: 3999,
    colors: ["Classic Camel", "Midnight Navy"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 148
  },
  {
    title: "Only Faux Fur Short Winter Jacket",
    description: "Plush and warm faux fur jacket featuring a standing collar and satin interior lining.",
    categoryName: "Jackets & Shrugs", subcategory: "Leather Jackets", brand: "Only", mrp: 4999, salePrice: 2899,
    colors: ["Dusty Pink", "Off White"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: false, bestSeller: true, rating: 4.7, reviewCount: 63
  },

  // Footwear & Heels
  {
    title: "Aldo Satin Strappy Stiletto Pumps",
    description: "Glamorous 4-inch stiletto pumps wrapped in glossy satin with delicate ankle straps and cushioned insoles for red-carpet elegance.",
    categoryName: "Footwear & Heels", subcategory: "Stiletto Heels", brand: "Aldo", mrp: 4299, salePrice: 2499,
    colors: ["Nude Beige", "Ruby Red"], sizes: ["UK 4", "UK 5", "UK 6", "UK 7"],
    images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.8, reviewCount: 112
  },
  {
    title: "Puma Retro Leather Platform Sneakers",
    description: "Trendy platform sneakers constructed with premium white leather, soft suede overlays, and lightweight rubber outsoles.",
    categoryName: "Footwear & Heels", subcategory: "Sneakers", brand: "Puma", mrp: 3999, salePrice: 2299,
    colors: ["Pure White", "Pastel Pink"], sizes: ["UK 4", "UK 5", "UK 6", "UK 7"],
    images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: false, bestSeller: true, rating: 4.6, reviewCount: 140
  },
  {
    title: "Nike Air Max Women's Running Shoes",
    description: "Iconic Air Max cushioning running shoes engineered with breathable mesh upper and responsive foam midsole.",
    categoryName: "Footwear & Heels", subcategory: "Sneakers", brand: "Nike", mrp: 5999, salePrice: 3599,
    colors: ["Rose Gold White", "All Black"], sizes: ["UK 4", "UK 5", "UK 6", "UK 7", "UK 8"],
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 230
  },
  {
    title: "Steve Madden Block Heel Leather Sandals",
    description: "Comfortable 2.5-inch block heel sandals crafted in smooth leather with square open toe.",
    categoryName: "Footwear & Heels", subcategory: "Sandals", brand: "Steve Madden", mrp: 3799, salePrice: 2199,
    colors: ["Tan Brown", "White"], sizes: ["UK 4", "UK 5", "UK 6", "UK 7"],
    images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: false, rating: 4.7, reviewCount: 78
  },
  {
    title: "Bata Pointed Toe Formal Slip-On Heels",
    description: "Sophisticated pointed-toe kitten heels with cushioned footbed for all-day office comfort.",
    categoryName: "Footwear & Heels", subcategory: "Flats", brand: "Bata", mrp: 2199, salePrice: 1199,
    colors: ["Black", "Nude"], sizes: ["UK 4", "UK 5", "UK 6", "UK 7"],
    images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: false, bestSeller: true, rating: 4.5, reviewCount: 105
  },
  {
    title: "Aldo Suede Leather Ankle Boots",
    description: "Chic suede ankle boots featuring almond toe shape and sturdy stacked block heel.",
    categoryName: "Footwear & Heels", subcategory: "Stiletto Heels", brand: "Aldo", mrp: 5499, salePrice: 3299,
    colors: ["Dark Brown", "Black Suede"], sizes: ["UK 4", "UK 5", "UK 6", "UK 7"],
    images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.8, reviewCount: 89
  },

  // Bags & Accessories
  {
    title: "Michael Kors Quilted Leather Chain Shoulder Bag",
    description: "Iconic quilted lambskin shoulder bag decorated with gold-tone hardware, chain strap, and turn-lock flap closure.",
    categoryName: "Bags & Accessories", subcategory: "Handbags", brand: "Michael Kors", mrp: 6999, salePrice: 4199,
    colors: ["Classic Black", "Blush Cream"], sizes: ["One Size"],
    images: ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 204
  },
  {
    title: "Louis Vuitton Monogram Canvas Luxury Tote Bag",
    description: "Spacious luxury tote bag crafted with durable coated canvas, natural cowhide leather trim, and gold-finish hardware.",
    categoryName: "Bags & Accessories", subcategory: "Tote Bags", brand: "Louis Vuitton", mrp: 8999, salePrice: 5499,
    colors: ["Monogram Brown"], sizes: ["Large"],
    images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: false, bestSeller: true, rating: 4.9, reviewCount: 165
  },
  {
    title: "Caprese Structured Faux Leather Crossbody Bag",
    description: "Compact structured crossbody bag featuring dual main zip compartments and removable chain strap.",
    categoryName: "Bags & Accessories", subcategory: "Clutches", brand: "Caprese", mrp: 2999, salePrice: 1599,
    colors: ["Powder Blue", "Peach Pink"], sizes: ["Small"],
    images: ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.6, reviewCount: 112
  },
  {
    title: "Ray-Ban Polarized Butterfly Sunglasses",
    description: "UV-protected polarized gradient lens sunglasses framed in lightweight gold-toned metal.",
    categoryName: "Bags & Accessories", subcategory: "Sunglasses", brand: "Ray-Ban", mrp: 4499, salePrice: 2699,
    colors: ["Gold Brown", "Rose Tint"], sizes: ["Free Size"],
    images: ["https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.8, reviewCount: 185
  },

  // Jewellery & Beauty
  {
    title: "Swarovski Crystal Pendant & Earring Jewellery Set",
    description: "Sparkling rhodium-plated jewellery set featuring solitaire crystal pendant necklace and matching drop earrings.",
    categoryName: "Jewellery & Beauty", subcategory: "Necklaces", brand: "Swarovski", mrp: 3999, salePrice: 2299,
    colors: ["Silver Crystal", "Rose Gold"], sizes: ["Free Size"],
    images: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.8, reviewCount: 128
  },
  {
    title: "Tanishq 18K Gold Plated Choker Necklace",
    description: "Opulent 18K gold plated choker necklace embedded with sparkling Kundan stones and pearl drops.",
    categoryName: "Jewellery & Beauty", subcategory: "Necklaces", brand: "Tanishq", mrp: 5999, salePrice: 3499,
    colors: ["Antique Gold"], sizes: ["Adjustable"],
    images: ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 198
  },
  {
    title: "MAC Velvet Matte Red Lipstick Collection",
    description: "Iconic long-wearing matte lipstick delivering intense color payoff and comfortable moisture.",
    categoryName: "Jewellery & Beauty", subcategory: "Lipsticks", brand: "MAC", mrp: 2100, salePrice: 1499,
    colors: ["Ruby Woo", "Velvet Teddy"], sizes: ["Standard 3g"],
    images: ["https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 310
  },
  {
    title: "Estee Lauder Luxury Eau De Parfum Spray",
    description: "Captivating floral eau de parfum featuring top notes of white lily, jasmine, and warm sandalwood.",
    categoryName: "Jewellery & Beauty", subcategory: "Perfumes", brand: "Estee Lauder", mrp: 6499, salePrice: 3999,
    colors: ["Crystal Bottle"], sizes: ["50ml"],
    images: ["https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 175
  },

  // 25 NEW GIRLS & WOMEN CLOTHING ITEMS
  {
    title: "Biba Floral Printed Cotton Anarkali Suit Set",
    description: "Vibrant yellow printed pure cotton Anarkali suit set with churidar pants and matching printed cotton dupatta.",
    categoryName: "Ethnic & Sarees", subcategory: "Anarkali Sets", brand: "Biba", mrp: 4499, salePrice: 2699,
    colors: ["Mustard Yellow", "Peach"], sizes: ["XS", "S", "M", "L", "XL"],
    images: ["https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.8, reviewCount: 165
  },
  {
    title: "W for Woman Gold Foil Print A-Line Kurti",
    description: "Graceful festive A-line kurti decorated with gold foil botanical motifs and keyhole neck detail.",
    categoryName: "Ethnic & Sarees", subcategory: "Kurta Sets", brand: "W for Woman", mrp: 2999, salePrice: 1799,
    colors: ["Navy Gold", "Emerald Green"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.7, reviewCount: 92
  },
  {
    title: "Global Desi Printed Silk Dupatta & Lehenga Set",
    description: "Bohemian printed crop top lehenga set styled with a contrast silk dupatta for festive celebrations.",
    categoryName: "Ethnic & Sarees", subcategory: "Lehengas", brand: "Giva", mrp: 7499, salePrice: 4299,
    colors: ["Coral Red", "Turquoise"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: false, bestSeller: true, rating: 4.9, reviewCount: 134
  },
  {
    title: "Aurelia Embroidered Velvet Straight Kurta",
    description: "Plush wine velvet straight kurta adorned with intricate neckline zardozi work and three-quarter sleeves.",
    categoryName: "Ethnic & Sarees", subcategory: "Kurta Sets", brand: "Tanishq", mrp: 3999, salePrice: 2299,
    colors: ["Wine Red", "Bottle Green"], sizes: ["S", "M", "L", "XL"],
    images: ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: false, rating: 4.6, reviewCount: 78
  },
  {
    title: "Manyavar Festive Tissue Silk Saree",
    description: "Luminous gold tissue silk saree with woven zari border and matching designer blouse piece.",
    categoryName: "Ethnic & Sarees", subcategory: "Designer Sarees", brand: "Manyavar", mrp: 6999, salePrice: 3999,
    colors: ["Tissue Gold", "Metallic Copper"], sizes: ["Free Size"],
    images: ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 205
  },

  {
    title: "Zara Satin Bias-Cut Slip Midi Dress",
    description: "Sleek liquid satin bias-cut slip dress featuring delicate adjustable straps and cowl neck detail.",
    categoryName: "Dresses & Gowns", subcategory: "Maxi Dresses", brand: "Zara", mrp: 3599, salePrice: 1999,
    colors: ["Emerald Satin", "Black Satin"], sizes: ["XS", "S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.8, reviewCount: 140
  },
  {
    title: "Mango Puff Sleeve Floral Georgette Dress",
    description: "Flowy georgette tiered midi dress styled with voluminous puff sleeves and waist tie belt.",
    categoryName: "Dresses & Gowns", subcategory: "Cocktail Dresses", brand: "Mango", mrp: 4299, salePrice: 2499,
    colors: ["Lilac Floral", "Cream Blossom"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: false, rating: 4.7, reviewCount: 88
  },
  {
    title: "H&M Ribbed Knit Bodycon Midi Dress",
    description: "Cozy ribbed knit bodycon midi dress featuring a square neckline and subtle side leg slit.",
    categoryName: "Dresses & Gowns", subcategory: "Bodycon Dresses", brand: "H&M", mrp: 2499, salePrice: 1299,
    colors: ["Muted Khaki", "Classic Black"], sizes: ["XS", "S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: false, bestSeller: true, rating: 4.6, reviewCount: 112
  },
  {
    title: "Forever 21 Sequined Party Glamour Mini Dress",
    description: "Sparkling all-over sequin mini dress featuring a plunging V-neckline and body-con silhouette.",
    categoryName: "Dresses & Gowns", subcategory: "Cocktail Dresses", brand: "Vero Moda", mrp: 3999, salePrice: 2199,
    colors: ["Glitz Silver", "Midnight Black"], sizes: ["XS", "S", "M"],
    images: ["https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 168
  },
  {
    title: "Vero Moda Off-Shoulder Velvet Evening Gown",
    description: "Dramatic floor-length velvet gown styled with an elegant off-shoulder foldover neckline.",
    categoryName: "Dresses & Gowns", subcategory: "Evening Gowns", brand: "Vero Moda", mrp: 6999, salePrice: 3999,
    colors: ["Royal Navy", "Ruby Red"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: false, bestSeller: true, rating: 4.8, reviewCount: 95
  },

  {
    title: "Zara Linen Blend Button-Up Summer Shirt",
    description: "Breezy relaxed fit linen-blend shirt featuring drop shoulders and mother-of-pearl buttons.",
    categoryName: "Tops & Tees", subcategory: "Shirts", brand: "Zara", mrp: 2599, salePrice: 1399,
    colors: ["Pastel Pink", "White Linen"], sizes: ["XS", "S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.7, reviewCount: 124
  },
  {
    title: "H&M Cotton Corset Style Bustier Crop Top",
    description: "Feminine cotton bustier top styled with sweet-heart wire neckline and hook closure back.",
    categoryName: "Tops & Tees", subcategory: "Crop Tops", brand: "H&M", mrp: 1799, salePrice: 899,
    colors: ["Black", "Powder Blue"], sizes: ["XS", "S", "M"],
    images: ["https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: false, rating: 4.5, reviewCount: 76
  },
  {
    title: "Mango Satin Cowl Neck Sleeveless Top",
    description: "Sophisticated glossy satin top with elegant cowl front drape. Ideal for layering under blazers.",
    categoryName: "Tops & Tees", subcategory: "Satin Blouses", brand: "Mango", mrp: 2199, salePrice: 1199,
    colors: ["Champagne", "Black"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: false, bestSeller: true, rating: 4.6, reviewCount: 108
  },
  {
    title: "Only Pastel Smocked Peplum Summer Top",
    description: "Cute smocked bodice top featuring flutter cap sleeves and a flared peplum waistline.",
    categoryName: "Tops & Tees", subcategory: "Casual Tees", brand: "Only", mrp: 1899, salePrice: 999,
    colors: ["Mint Floral", "Lavender"], sizes: ["XS", "S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.7, reviewCount: 82
  },

  {
    title: "Levi's High-Rise Wide Leg Straight Jeans",
    description: "Flattering high-rise wide leg straight jeans tailored in rigid vintage cotton denim.",
    categoryName: "Bottoms & Jeans", subcategory: "High-Waist Jeans", brand: "Levi's", mrp: 3799, salePrice: 2299,
    colors: ["Medium Vintage Blue", "Dark Indigo"], sizes: ["26", "28", "30", "32"],
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.8, reviewCount: 189
  },
  {
    title: "Zara Tailored Linen Blend Wide Leg Trousers",
    description: "Lightweight summer trousers featuring high waist pleats and elasticated back waistband.",
    categoryName: "Bottoms & Jeans", subcategory: "Wide Leg Trousers", brand: "Zara", mrp: 3499, salePrice: 1999,
    colors: ["Natural Flax", "Off White"], sizes: ["XS", "S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: false, rating: 4.6, reviewCount: 71
  },
  {
    title: "Mango High-Waist Accordion Pleated Midi Skirt",
    description: "Elegant accordion pleated midi skirt in metallic sheen satin fabric.",
    categoryName: "Bottoms & Jeans", subcategory: "Skirts", brand: "Mango", mrp: 3299, salePrice: 1799,
    colors: ["Bronze Gold", "Emerald Green"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: false, bestSeller: true, rating: 4.8, reviewCount: 114
  },
  {
    title: "Vero Moda High-Rise Paperbag Waist Shorts",
    description: "Cute high-waisted cotton paperbag shorts featuring a matching fabric tie belt.",
    categoryName: "Bottoms & Jeans", subcategory: "Palazzos", brand: "Vero Moda", mrp: 2199, salePrice: 1199,
    colors: ["Terracotta", "Olive"], sizes: ["XS", "S", "M"],
    images: ["https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: false, rating: 4.5, reviewCount: 54
  },

  {
    title: "Tommy Hilfiger Cropped Corduroy Trucker Jacket",
    description: "Vintage-inspired plush corduroy trucker jacket styled with sherpa collar lining.",
    categoryName: "Jackets & Shrugs", subcategory: "Denim Jackets", brand: "Tommy Hilfiger", mrp: 5999, salePrice: 3499,
    colors: ["Rust Tan", "Forest Green"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 142
  },
  {
    title: "Zara Oversized Tailored Wool Blend Coat",
    description: "Minimalist oversized wool-blend coat featuring notch lapels and double button front closure.",
    categoryName: "Jackets & Shrugs", subcategory: "Blazers", brand: "Zara", mrp: 7999, salePrice: 4699,
    colors: ["Oatmeal Camel", "Charcoal Black"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 180
  },

  {
    title: "Steve Madden Pearl Embellished Block Heels",
    description: "Chic 3-inch block heels adorned with delicate faux pearl straps and cushioned footbed.",
    categoryName: "Footwear & Heels", subcategory: "Stiletto Heels", brand: "Steve Madden", mrp: 4599, salePrice: 2699,
    colors: ["Ivory White", "Blush Pink"], sizes: ["UK 4", "UK 5", "UK 6", "UK 7"],
    images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.8, reviewCount: 156
  },
  {
    title: "Aldo Pointed Toe Satin Evening Mules",
    description: "Glamorous slip-on satin mules featuring a crystal brooch buckle and 2-inch heel.",
    categoryName: "Footwear & Heels", subcategory: "Flats", brand: "Aldo", mrp: 3999, salePrice: 2299,
    colors: ["Emerald Green", "Black Satin"], sizes: ["UK 4", "UK 5", "UK 6", "UK 7"],
    images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.7, reviewCount: 98
  },

  {
    title: "Michael Kors Small Leather Chain Crossbody Bag",
    description: "Pebbled leather crossbody bag styled with polished gold chain strap and zip-around closure.",
    categoryName: "Bags & Accessories", subcategory: "Handbags", brand: "Michael Kors", mrp: 5499, salePrice: 3299,
    colors: ["Soft Pink", "Black"], sizes: ["Small"],
    images: ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 210
  },

  {
    title: "Tanishq Rose Gold Crystal Drop Earrings",
    description: "Sparkling rose gold plated drop earrings set with teardrop cubic zirconia crystals.",
    categoryName: "Jewellery & Beauty", subcategory: "Earring Sets", brand: "Tanishq", mrp: 2999, salePrice: 1699,
    colors: ["Rose Gold"], sizes: ["Free Size"],
    images: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.8, reviewCount: 160
  },
  {
    title: "L'Oreal Paris Velvet Matte Lip Crayon Set",
    description: "Set of 3 long-lasting velvet matte lip crayons enriched with jojoba oil.",
    categoryName: "Jewellery & Beauty", subcategory: "Lipsticks", brand: "L'Oreal", mrp: 1999, salePrice: 1299,
    colors: ["Nude & Berry Trio"], sizes: ["Pack of 3"],
    images: ["https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.7, reviewCount: 142
  }
];

console.log("> Purging all non-women data...");
await Category.deleteMany({});
await Product.deleteMany({});
await Coupon.deleteMany({});

const seededCats = await Category.insertMany(categoriesData);
const catMap = {};
seededCats.forEach(c => { catMap[c.name] = c._id; });
console.log("> Inserted", seededCats.length, "women fashion categories.");

const productsToInsert = womenProductsData.map((prod, idx) => ({
  title: prod.title,
  description: prod.description,
  sku: `SKU-KIRNYA-WOMEN-${1000 + idx + 1}`,
  mrp: prod.mrp,
  salePrice: prod.salePrice,
  brand: prod.brand,
  rating: prod.rating,
  reviewCount: prod.reviewCount,
  specifications: [
    { name: "Material", value: "Premium Silk / Cotton Blend" },
    { name: "Fit Type", value: "Slim & Regular Fit" },
    { name: "Occasion", value: "Party & Evening Wear" },
    { name: "Care Instructions", value: "Dry Clean Only" }
  ],
  colors: prod.colors,
  sizes: prod.sizes,
  images: prod.images,
  videoUrl: "",
  view360Images: prod.images,
  stock: Math.floor(15 + Math.random() * 85),
  category: catMap[prod.categoryName],
  subcategory: prod.subcategory,
  tags: ["women", "kirnya", prod.brand.toLowerCase(), prod.subcategory.toLowerCase(), "fashion"],
  featured: prod.featured,
  trending: prod.trending,
  bestSeller: prod.bestSeller,
  latest: true,
  newArrival: true,
  offerProduct: idx % 3 === 0,
  isActive: true
}));

await Product.insertMany(productsToInsert);
console.log("> Inserted", productsToInsert.length, "curated women clothing products!");

const expiry = new Date(); expiry.setMonth(expiry.getMonth() + 6);
await Coupon.insertMany([
  { code: "KIRNYANEW", discountType: "Percentage", value: 20, minPurchase: 1499, maxDiscount: 500, expiryDate: expiry },
  { code: "WOMEN10", discountType: "Percentage", value: 10, minPurchase: 999, maxDiscount: 200, expiryDate: expiry },
  { code: "FASHION500", discountType: "Fixed", value: 500, minPurchase: 3999, expiryDate: expiry }
]);
console.log("> Inserted coupons.");

const hash = crypto.createHash("sha256").update("password123valois-salt-string").digest("hex");
const existing = await User.findOne({ email: "dlpfjdr@gmail.com" });
if (!existing) {
  await User.create({ name: "Kirnya Owner", email: "dlpfjdr@gmail.com", mobile: "+918888888888", role: "Owner", walletBalance: 100000, password: hash });
} else {
  await User.updateOne({ email: "dlpfjdr@gmail.com" }, { role: "Owner" });
}
console.log("> Owner confirmed.");

await mongoose.disconnect();
console.log("\nAll done! Seeded " + productsToInsert.length + " women's clothing items into Kirnya database.");
