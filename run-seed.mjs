import dotenv from "dotenv";
dotenv.config();
import dns from "dns";
import mongoose from "mongoose";
import crypto from "crypto";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // ignore
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("> MONGODB_URI missing in .env");
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
console.log("> Connected! DB:", mongoose.connection.name);

const { Schema, model, models } = mongoose;

const img = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

const toSubs = (names) =>
  names.map((name, order) => ({ name, enabled: true, order }));

const slugify = (text = "") =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const categorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    subcategories: { type: [Schema.Types.Mixed], default: [] }
  },
  { timestamps: true }
);
const Category = models.Category || model("Category", categorySchema);

const productSchema = new Schema(
  {
    title: String,
    slug: { type: String, unique: true, sparse: true },
    shortDescription: String,
    description: String,
    sku: { type: String, unique: true },
    mrp: Number,
    salePrice: Number,
    discount: Number,
    brand: String,
    rating: Number,
    reviewCount: Number,
    specifications: [{ name: String, value: String }],
    colors: [String],
    sizes: [String],
    images: [String],
    videoUrl: { type: String, default: "" },
    view360Images: [String],
    stock: Number,
    lowStockThreshold: { type: Number, default: 15 },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    subcategory: String,
    tags: [String],
    status: { type: String, default: "published" },
    featured: Boolean,
    trending: Boolean,
    bestSeller: Boolean,
    latest: Boolean,
    newArrival: Boolean,
    offerProduct: Boolean,
    soldCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);
const Product = models.Product || model("Product", productSchema);

const couponSchema = new Schema(
  {
    code: { type: String, unique: true },
    discountType: String,
    value: Number,
    minPurchase: Number,
    maxDiscount: Number,
    expiryDate: Date,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);
const Coupon = models.Coupon || model("Coupon", couponSchema);

const userSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true },
    mobile: String,
    role: String,
    walletBalance: Number,
    password: String
  },
  { timestamps: true, strict: false }
);
const User = models.User || model("User", userSchema);

/** Meesho-style departments */
const CATALOG = [
  {
    name: "Women",
    slug: "women",
    image: img("photo-1490481651871-ab68de25d43d"),
    order: 0,
    subs: ["Kurtis & Tunics", "Sarees", "Western Dresses", "Tops & Tees", "Jeans & Trousers", "Ethnic Sets"],
    brands: ["Zentro", "Biba", "W", "Zara", "Mango", "Only"],
    sizes: ["XS", "S", "M", "L", "XL"],
    images: {
      "Kurtis & Tunics": [img("photo-1583391733956-3750e0ff4e8b"), img("photo-1617627143750-d86bc21e42bb"), img("photo-1594736797933-d0501ba2fe65")],
      Sarees: [img("photo-1610030469983-98e550d6193c"), img("photo-1583391733956-3750e0ff4e8b"), img("photo-1594736797933-d0501ba2fe65")],
      "Western Dresses": [img("photo-1595777457583-95e059d581b8"), img("photo-1515886657613-9f3515b0c78f"), img("photo-1566174053879-31528523f8ae")],
      "Tops & Tees": [img("photo-1503342217505-b0a15ec3261c"), img("photo-1521572163474-6864f9cf17ab"), img("photo-1554568218-0f1715e72254")],
      "Jeans & Trousers": [img("photo-1541099649105-f69ad21f3246"), img("photo-1542272604-787c3835535d"), img("photo-1594633312681-425c7b97ccd1")],
      "Ethnic Sets": [img("photo-1610030469983-98e550d6193c"), img("photo-1594736797933-d0501ba2fe65"), img("photo-1583391733956-3750e0ff4e8b")]
    },
    titles: {
      "Kurtis & Tunics": ["Floral Print Straight Kurti", "Embroidered Anarkali Kurti", "Cotton Daily Wear Tunic"],
      Sarees: ["Organza Party Wear Saree", "Banarasi Silk Saree", "Georgette Printed Saree"],
      "Western Dresses": ["A-Line Summer Dress", "Bodycon Midi Dress", "Floral Maxi Dress"],
      "Tops & Tees": ["Ribbed Crop Top", "Satin Casual Blouse", "Oversized Cotton Tee"],
      "Jeans & Trousers": ["High-Rise Skinny Jeans", "Wide Leg Palazzo Pants", "Stretch Cigarette Trousers"],
      "Ethnic Sets": ["Kurta Palazzo Dupatta Set", "Festive Sharara Suit", "Printed Co-ord Set"]
    }
  },
  {
    name: "Men",
    slug: "men",
    image: img("photo-1507679799987-c73779587ccf"),
    order: 1,
    subs: ["T-Shirts", "Casual Shirts", "Jeans", "Ethnic Wear", "Jackets", "Trousers"],
    brands: ["Levi's", "Roadster", "HRX", "Allen Solly", "Peter England", "Nike"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: {
      "T-Shirts": [img("photo-1521572163474-6864f9cf17ab"), img("photo-1583743814966-8936f5b7be1a"), img("photo-1576566588028-4147f3842f27")],
      "Casual Shirts": [img("photo-1596755094514-f87e34085b2c"), img("photo-1602810318383-e386cc2a3ccf"), img("photo-1594938298603-c8148c4dae35")],
      Jeans: [img("photo-1542272604-787c3835535d"), img("photo-1475178626620-a4d074967452"), img("photo-1582418702059-97ebafb35d09")],
      "Ethnic Wear": [img("photo-1593032465175-481ac7f401a0"), img("photo-1617137968427-85924c800a22"), img("photo-1507679799987-c73779587ccf")],
      Jackets: [img("photo-1551028719-00167b16eac5"), img("photo-1521223890158-f9f7c3d5d504"), img("photo-1544022613-e87ca75a784a")],
      Trousers: [img("photo-1594633312681-425c7b97ccd1"), img("photo-1506629082955-511b1aa78283"), img("photo-1594938298603-c8148c4dae35")]
    },
    titles: {
      "T-Shirts": ["Solid Round Neck Tee", "Graphic Print T-Shirt", "Polo Collar T-Shirt"],
      "Casual Shirts": ["Checked Casual Shirt", "Oxford Formal Shirt", "Linen Summer Shirt"],
      Jeans: ["Slim Fit Mid-Rise Jeans", "Relaxed Fit Denim", "Tapered Stretch Jeans"],
      "Ethnic Wear": ["Cotton Kurta Pyjama Set", "Festive Embroidered Kurta", "Nehru Jacket Set"],
      Jackets: ["Bomber Jacket", "Denim Trucker Jacket", "Puffer Winter Jacket"],
      Trousers: ["Chino Trousers", "Formal Slim Pants", "Cargo Utility Pants"]
    }
  },
  {
    name: "Kids",
    slug: "kids",
    image: img("photo-1503919545889-aef636e10ad4"),
    order: 2,
    subs: ["Boys Clothing", "Girls Clothing", "Infant Wear", "Kids Footwear", "School Essentials"],
    brands: ["Carter's", "Mothercare", "Gini & Jony", "Max", "HRX Kids"],
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    images: {
      "Boys Clothing": [img("photo-1519457431-44ccd64a579b"), img("photo-1503919545889-aef636e10ad4"), img("photo-1471286174243-e7a4dbf0b7c1")],
      "Girls Clothing": [img("photo-1518831959646-742c3a14ebf7"), img("photo-1503919545889-aef636e10ad4"), img("photo-1519457431-44ccd64a579b")],
      "Infant Wear": [img("photo-1515488042361-ee00e0ddd4e4"), img("photo-1522771930-78848d92957e"), img("photo-1519457431-44ccd64a579b")],
      "Kids Footwear": [img("photo-1514989940723-e8e51635b782"), img("photo-1460353581641-37baddab0fa2"), img("photo-1542291026-7eec264c27ff")],
      "School Essentials": [img("photo-1588072432836-e10032774318"), img("photo-1503676260728-1c00da094a0b"), img("photo-1456513080800-7d93d3d34f58")]
    },
    titles: {
      "Boys Clothing": ["Cotton Printed T-Shirt Set", "Denim Shorts Pack", "Hoodie & Jogger Set"],
      "Girls Clothing": ["Floral Frock Dress", "Tutu Party Skirt Set", "Printed Top & Leggings"],
      "Infant Wear": ["Soft Onesie Pack of 3", "Baby Romper Set", "Cotton Bib & Cap Combo"],
      "Kids Footwear": ["Velcro Sports Shoes", "Cartoon Slip-On Sandals", "School Uniform Shoes"],
      "School Essentials": ["Waterproof School Bag", "Lunch Box Combo", "Water Bottle Set"]
    }
  },
  {
    name: "Footwear",
    slug: "footwear",
    image: img("photo-1543163521-1bf539c55dd2"),
    order: 3,
    subs: ["Women Heels", "Women Flats", "Men Sneakers", "Men Formal Shoes", "Sandals & Flip-Flops"],
    brands: ["Bata", "Nike", "Adidas", "Aldo", "Puma", "Red Tape"],
    sizes: ["UK 4", "UK 5", "UK 6", "UK 7", "UK 8", "UK 9"],
    images: {
      "Women Heels": [img("photo-1543163521-1bf539c55dd2"), img("photo-1515347619252-60a4bf4fff4f"), img("photo-1535043934128-cf0b28d52f95")],
      "Women Flats": [img("photo-1562273138-f46be4ebdf33"), img("photo-1603487742131-4160ec999306"), img("photo-1525966223011-a1e4989aef52")],
      "Men Sneakers": [img("photo-1542291026-7eec264c27ff"), img("photo-1606107557195-0e29a4b5b4aa"), img("photo-1595950653106-6c9ebd614d3a")],
      "Men Formal Shoes": [img("photo-1614252231331-1bf9c2c4e4d4"), img("photo-1533867617858-e7b97e060509"), img("photo-1449505278894-297fdb3edbc1")],
      "Sandals & Flip-Flops": [img("photo-1603487742131-4160ec999306"), img("photo-1603808033192-082d4485074a"), img("photo-1562273138-f46be4ebdf33")]
    },
    titles: {
      "Women Heels": ["Block Heel Sandals", "Stiletto Party Pumps", "Kitten Heel Mules"],
      "Women Flats": ["Ballet Comfort Flats", "Embellished Mojaris", "Slip-On Loafers"],
      "Men Sneakers": ["Court Lifestyle Sneakers", "Running Mesh Shoes", "Retro Casual Sneakers"],
      "Men Formal Shoes": ["Leather Oxford Shoes", "Derby Office Shoes", "Monk Strap Formal"],
      "Sandals & Flip-Flops": ["Cushion Flip-Flops", "Outdoor Trek Sandals", "Soft Sole House Slippers"]
    }
  },
  {
    name: "Bags & Luggage",
    slug: "bags-luggage",
    image: img("photo-1584917865442-de89df76afd3"),
    order: 4,
    subs: ["Handbags", "Backpacks", "Sling Bags", "Wallets", "Travel Luggage"],
    brands: ["Wildcraft", "American Tourister", "Caprese", "Lavie", "Safari"],
    sizes: ["One Size"],
    images: {
      Handbags: [img("photo-1584917865442-de89df76afd3"), img("photo-1590874103328-eac38a683ce7"), img("photo-1566150905458-1bf1fc113f0d")],
      Backpacks: [img("photo-1553062407-98eeb64c6a62"), img("photo-1622560480605-d83c853bc5c3"), img("photo-1581605405669-fdf2712c2231")],
      "Sling Bags": [img("photo-1544816155-12df9643f363"), img("photo-1590874103328-eac38a683ce7"), img("photo-1584917865442-de89df76afd3")],
      Wallets: [img("photo-1627123424574-724758594f63"), img("photo-1620799140408-edc6dcb6d633"), img("photo-1553062407-98eeb64c6a62")],
      "Travel Luggage": [img("photo-1565026057447-bc90a1d2c310"), img("photo-1581605405669-fdf2712c2231"), img("photo-1553062407-98eeb64c6a62")]
    },
    titles: {
      Handbags: ["Quilted Shoulder Bag", "Structured Office Handbag", "Tote Everyday Bag"],
      Backpacks: ["Laptop Backpack 25L", "College Casual Backpack", "Travel Daypack"],
      "Sling Bags": ["Crossbody Sling", "Mini Belt Bag", "Phone Pouch Sling"],
      Wallets: ["RFID Leather Wallet", "Bifold Card Holder", "Zip-Around Wallet"],
      "Travel Luggage": ["Hard Shell Cabin Trolley", "Soft Duffel Bag", "Expandable Check-in Luggage"]
    }
  },
  {
    name: "Jewellery",
    slug: "jewellery",
    image: img("photo-1515562141207-7a88fb7ce338"),
    order: 5,
    subs: ["Necklaces", "Earrings", "Bangles & Bracelets", "Rings", "Artificial Jewellery Sets"],
    brands: ["Giva", "Swarovski", "Tanishq", "Voylla", "Zaveri Pearls"],
    sizes: ["One Size", "Free Size"],
    images: {
      Necklaces: [img("photo-1599643478518-a784e5dc4c8f"), img("photo-1515562141207-7a88fb7ce338"), img("photo-1611652022419-a9419f74343d")],
      Earrings: [img("photo-1535632066927-ab7c9ab60908"), img("photo-1630019852942-f89202989a59"), img("photo-1617038260897-41a1f14a8ca0")],
      "Bangles & Bracelets": [img("photo-1611591437281-460bfbe1220a"), img("photo-1605100804763-247f67b3557e"), img("photo-1515562141207-7a88fb7ce338")],
      Rings: [img("photo-1605100804763-247f67b3557e"), img("photo-1603561596112-0a132b757442"), img("photo-1515562141207-7a88fb7ce338")],
      "Artificial Jewellery Sets": [img("photo-1599643478518-a784e5dc4c8f"), img("photo-1535632066927-ab7c9ab60908"), img("photo-1611652022419-a9419f74343d")]
    },
    titles: {
      Necklaces: ["Layered Chain Pendant", "Pearl Statement Necklace", "Oxidised Choker"],
      Earrings: ["Hoop Earrings Pair", "Jhumka Traditional Set", "Stud Earrings Pack"],
      "Bangles & Bracelets": ["Gold-Tone Bangle Set", "Charm Bracelet", "Kada Pair"],
      Rings: ["Adjustable Statement Ring", "Stackable Band Set", "Solitaire Style Ring"],
      "Artificial Jewellery Sets": ["Bridal Necklace Set", "Party Wear Combo Set", "Temple Jewellery Set"]
    }
  },
  {
    name: "Beauty & Health",
    slug: "beauty-health",
    image: img("photo-1596462502278-27bfdc403348"),
    order: 6,
    subs: ["Makeup", "Skincare", "Hair Care", "Fragrances", "Personal Care"],
    brands: ["Maybelline", "Lakme", "MAC", "Nivea", "Dove", "The Body Shop"],
    sizes: ["One Size", "50ml", "100ml", "200ml"],
    images: {
      Makeup: [img("photo-1586495777744-4413f21062fa"), img("photo-1522335789203-aabd1fc54bc9"), img("photo-1512496015851-a90fb38ba796")],
      Skincare: [img("photo-1556228578-0d85b1a4d571"), img("photo-1570172619604-c7f26d3e8e1e"), img("photo-1596462502278-27bfdc403348")],
      "Hair Care": [img("photo-1527799820374-dcf8d9d4a388"), img("photo-1631729371254-42c2892b4cd2"), img("photo-1522335789203-aabd1fc54bc9")],
      Fragrances: [img("photo-1541643600914-78b084683601"), img("photo-1594035910387-fea4779426e9"), img("photo-1587017539504-67cfbddac569")],
      "Personal Care": [img("photo-1556228720-195a672e8a03"), img("photo-1608248543804-ba4f2c4e8e2e"), img("photo-1570172619604-c7f26d3e8e1e")]
    },
    titles: {
      Makeup: ["Matte Liquid Lipstick", "Kajal & Eyeliner Combo", "Compact Powder Kit"],
      Skincare: ["Vitamin C Face Serum", "Hydrating Moisturizer", "Sunscreen SPF 50"],
      "Hair Care": ["Anti-Hairfall Shampoo", "Argan Hair Oil", "Leave-In Conditioner"],
      Fragrances: ["Fresh Citrus EDT", "Floral Eau de Parfum", "Woody Body Mist"],
      "Personal Care": ["Body Lotion Pack", "Hand Cream Duo", "Face Wash Combo"]
    }
  },
  {
    name: "Home & Kitchen",
    slug: "home-kitchen",
    image: img("photo-1556909114-f6e7ad7d3136"),
    order: 7,
    subs: ["Home Decor", "Kitchen Tools", "Bedding", "Storage", "Lighting"],
    brands: ["IKEA Style", "Home Centre", "Amazon Basics", "Solimo", "Wakefit"],
    sizes: ["One Size", "Single", "Double", "Queen"],
    images: {
      "Home Decor": [img("photo-1586023492125-27b2c045efd7"), img("photo-1616486338812-3dadae4b4ace"), img("photo-1555041469-a586c61ea9bc")],
      "Kitchen Tools": [img("photo-1556909114-f6e7ad7d3136"), img("photo-1556910103-1c02745aae4d"), img("photo-1584990348027-e4f4f0c7d8b0")],
      Bedding: [img("photo-1522771739844-6a9f6d5f14af"), img("photo-1631049307264-da0ec9d70304"), img("photo-1505693416388-ac5ce068fe85")],
      Storage: [img("photo-1595428774223-ef52624120d2"), img("photo-1594026112284-02bb6f3352bb"), img("photo-1586023492125-27b2c045efd7")],
      Lighting: [img("photo-1513506003901-1e6a229e2d15"), img("photo-1507473885765-e6ed057f782c"), img("photo-1524484485619-4e5c3e0e8f5e")]
    },
    titles: {
      "Home Decor": ["Wall Art Canvas Set", "Ceramic Vase Pair", "Cushion Cover Pack of 4"],
      "Kitchen Tools": ["Non-Stick Cookware Set", "Stainless Knife Set", "Mixing Bowl Trio"],
      Bedding: ["Cotton Bedsheet Set", "Microfiber Comforter", "Pillow Pair Soft"],
      Storage: ["Stackable Storage Boxes", "Wardrobe Organizer Set", "Underbed Storage Bag"],
      Lighting: ["LED Desk Lamp", "Fairy String Lights", "Wall Sconce Pair"]
    }
  },
  {
    name: "Electronics",
    slug: "electronics",
    image: img("photo-1505740420928-5e560c06d30e"),
    order: 8,
    subs: ["Headphones", "Smart Watches", "Mobile Accessories", "Power Banks", "Speakers"],
    brands: ["boAt", "Noise", "JBL", "Samsung", "Mi", "Sony"],
    sizes: ["One Size"],
    images: {
      Headphones: [img("photo-1505740420928-5e560c06d30e"), img("photo-1484704849700-f032a568e944"), img("photo-1546435770-a3e426b5768e")],
      "Smart Watches": [img("photo-1523275335684-37898b6baf30"), img("photo-1579586337278-3befd40fd17a"), img("photo-1547996160-81dfa63595aa")],
      "Mobile Accessories": [img("photo-1601784551446-20c9e07cdbdb"), img("photo-1511707171634-5f897ff02aa9"), img("photo-1580910051074-3eb694886505")],
      "Power Banks": [img("photo-1609091839311-d5365f9ff1c5"), img("photo-1625948515291-69613efd103f"), img("photo-1601784551446-20c9e07cdbdb")],
      Speakers: [img("photo-1608043152269-423dbba4e7e1"), img("photo-1545454675-3531b543be5d"), img("photo-1505740420928-5e560c06d30e")]
    },
    titles: {
      Headphones: ["Wireless Bluetooth Earbuds", "Over-Ear Noise Cancelling", "Neckband Earphones"],
      "Smart Watches": ["Fitness Smartwatch", "AMOLED Calling Watch", "Sports Band Tracker"],
      "Mobile Accessories": ["Fast Charge Cable Pack", "Tempered Glass Combo", "Phone Grip Stand"],
      "Power Banks": ["10000mAh Power Bank", "20000mAh Fast Charge Bank", "Magnetic Wireless Bank"],
      Speakers: ["Portable Bluetooth Speaker", "Party Boom Box", "Mini Waterproof Speaker"]
    }
  },
  {
    name: "Sports & Fitness",
    slug: "sports-fitness",
    image: img("photo-1517836357463-d25dfeac3438"),
    order: 9,
    subs: ["Activewear", "Yoga", "Gym Accessories", "Sports Shoes", "Outdoor"],
    brands: ["Nike", "Adidas", "Puma", "HRX", "Decathlon"],
    sizes: ["S", "M", "L", "XL", "UK 6", "UK 7", "UK 8", "One Size"],
    images: {
      Activewear: [img("photo-1517836357463-d25dfeac3438"), img("photo-1571019614242-c5c5dee9f50b"), img("photo-1518611012118-696072aa579a")],
      Yoga: [img("photo-1544367567-0f2fcb009e0b"), img("photo-1599901860904-17e6ed7083a0"), img("photo-1518611012118-696072aa579a")],
      "Gym Accessories": [img("photo-1517836357463-d25dfeac3438"), img("photo-1534438327276-14e5300c3a48"), img("photo-1571019614242-c5c5dee9f50b")],
      "Sports Shoes": [img("photo-1542291026-7eec264c27ff"), img("photo-1606107557195-0e29a4b5b4aa"), img("photo-1460353581641-37baddab0fa2")],
      Outdoor: [img("photo-1551632811-561732d1e306"), img("photo-1504280390367-361c6d9f38f4"), img("photo-1478131143081-80f7f84ca84d")]
    },
    titles: {
      Activewear: ["Dry-Fit Training Tee", "Compression Tights", "Sports Bra Pack"],
      Yoga: ["Non-Slip Yoga Mat", "Yoga Pants", "Meditation Cushion"],
      "Gym Accessories": ["Resistance Band Set", "Adjustable Dumbbell Pair", "Gym Gloves"],
      "Sports Shoes": ["Running Shoes", "Training Cross Trainers", "Walking Mesh Shoes"],
      Outdoor: ["Camping Water Bottle", "Hiking Daypack", "Sports Cap Pack"]
    }
  }
];

const COLORS = ["Black", "White", "Navy", "Beige", "Red", "Olive", "Grey", "Pink", "Blue", "Brown"];

const buildProducts = (catMap) => {
  const products = [];
  let idx = 0;
  const usedSlugs = new Set();

  for (const cat of CATALOG) {
    const categoryId = catMap[cat.name];
    if (!categoryId) continue;

    for (const sub of cat.subs) {
      const titleList = cat.titles[sub] || [`Premium ${sub} Item`];
      const imagePool = cat.images[sub] || Object.values(cat.images)[0];
      // 2 products per subcategory → ~100 across catalog
      for (let n = 0; n < 2; n++) {
        const baseTitle = titleList[n % titleList.length];
        const brand = cat.brands[(idx + n) % cat.brands.length];
        const title = `${brand} ${baseTitle}${n > 0 && titleList.length === 1 ? ` ${n + 1}` : n > 0 ? ` - Edition ${n + 1}` : ""}`;
        let slug = slugify(title);
        if (usedSlugs.has(slug)) slug = `${slug}-${idx + 1}`;
        usedSlugs.add(slug);

        const mrp = Math.round((499 + ((idx * 137) % 4500)) / 50) * 50 + 49;
        const salePrice = Math.round(mrp * (0.45 + ((idx % 5) * 0.08)));
        const discount = Math.max(0, Math.round(((mrp - salePrice) / mrp) * 100));
        const images = [
          imagePool[n % imagePool.length],
          imagePool[(n + 1) % imagePool.length],
          imagePool[(n + 2) % imagePool.length]
        ];

        products.push({
          title,
          slug,
          shortDescription: `${baseTitle} from ${brand} — quality pick for everyday shopping.`,
          description: `Shop ${title} on Zentro. ${baseTitle} crafted for comfort and value, inspired by Meesho-style everyday marketplace finds. Perfect for ${cat.name.toLowerCase()} shoppers looking for ${sub.toLowerCase()}.`,
          sku: `SKU-ZENTRO-${String(1001 + idx)}`,
          mrp,
          salePrice,
          discount,
          brand,
          rating: Number((3.9 + ((idx % 10) / 10)).toFixed(1)),
          reviewCount: 20 + ((idx * 17) % 400),
          specifications: [
            { name: "Brand", value: brand },
            { name: "Category", value: cat.name },
            { name: "Type", value: sub },
            { name: "Care", value: "Follow product label" }
          ],
          colors: [COLORS[idx % COLORS.length], COLORS[(idx + 3) % COLORS.length]],
          sizes: cat.sizes,
          images,
          videoUrl: "",
          view360Images: images,
          stock: 25 + ((idx * 11) % 150),
          lowStockThreshold: 15,
          category: categoryId,
          subcategory: sub,
          tags: [cat.name.toLowerCase(), sub.toLowerCase(), brand.toLowerCase(), "zentro", "meesho-style"],
          status: "published",
          featured: idx % 9 === 0,
          trending: idx % 6 === 0,
          bestSeller: idx % 7 === 0,
          latest: idx % 5 === 0,
          newArrival: idx % 4 === 0,
          offerProduct: idx % 8 === 0,
          soldCount: 10 + ((idx * 3) % 200),
          viewCount: 100 + ((idx * 19) % 2000)
        });
        idx += 1;
      }
    }
  }
  return products;
};

console.log("> Purging Category, Product, Coupon...");
await Category.deleteMany({});
await Product.deleteMany({});
await Coupon.deleteMany({});

const categoriesData = CATALOG.map((c) => ({
  name: c.name,
  slug: c.slug,
  image: c.image,
  enabled: true,
  order: c.order,
  subcategories: toSubs(c.subs)
}));

const seededCats = await Category.insertMany(categoriesData);
const catMap = {};
seededCats.forEach((c) => {
  catMap[c.name] = c._id;
});
console.log(`> Inserted ${seededCats.length} Meesho-style categories.`);

const productsToInsert = buildProducts(catMap);
const under3 = productsToInsert.filter((p) => (p.images || []).length < 3);
if (under3.length) {
  console.error("> ERROR under 3 images:", under3.map((p) => p.title));
  process.exit(1);
}

await Product.insertMany(productsToInsert);
console.log(`> Inserted ${productsToInsert.length} products (≥3 images each).`);

await Coupon.insertMany([
  {
    code: "ZENTRO10",
    discountType: "percentage",
    value: 10,
    minPurchase: 999,
    maxDiscount: 500,
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    code: "WELCOME200",
    discountType: "fixed",
    value: 200,
    minPurchase: 1499,
    maxDiscount: 200,
    expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    isActive: true
  }
]);
console.log("> Inserted demo coupons.");

const ownerEmail = "dlpfjdr@gmail.com";
const owner = await User.findOne({ email: ownerEmail });
if (owner) {
  owner.role = "Owner";
  await owner.save();
  console.log("> Ensured Owner role for", ownerEmail);
} else {
  const hashed = crypto
    .createHash("sha256")
    .update("password123" + "valois-salt-string")
    .digest("hex");
  await User.create({
    name: "Zentro Owner",
    email: ownerEmail,
    mobile: "+918888888888",
    role: "Owner",
    walletBalance: 100000,
    password: hashed
  });
  console.log("> Created Owner", ownerEmail);
}

console.log("> Seed complete.");
await mongoose.disconnect();
process.exit(0);
