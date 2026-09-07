import crypto from "crypto";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import WebsiteSettings from "../models/WebsiteSettings.js";

const toSubs = (names) => names.map((name, order) => ({ name, enabled: true, order }));

const categoriesData = [
  { name: "Women", slug: "women", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80", enabled: true, order: 0, subcategories: toSubs(["Kurtis & Tunics", "Sarees", "Western Dresses", "Tops & Tees", "Jeans & Trousers", "Ethnic Sets"]) },
  { name: "Men", slug: "men", image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80", enabled: true, order: 1, subcategories: toSubs(["T-Shirts", "Casual Shirts", "Jeans", "Ethnic Wear", "Jackets", "Trousers"]) },
  { name: "Kids", slug: "kids", image: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=600&q=80", enabled: true, order: 2, subcategories: toSubs(["Boys Clothing", "Girls Clothing", "Infant Wear", "Kids Footwear", "School Essentials"]) },
  { name: "Footwear", slug: "footwear", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80", enabled: true, order: 3, subcategories: toSubs(["Women Heels", "Women Flats", "Men Sneakers", "Men Formal Shoes", "Sandals & Flip-Flops"]) },
  { name: "Bags & Luggage", slug: "bags-luggage", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80", enabled: true, order: 4, subcategories: toSubs(["Handbags", "Backpacks", "Sling Bags", "Wallets", "Travel Luggage"]) },
  { name: "Jewellery", slug: "jewellery", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80", enabled: true, order: 5, subcategories: toSubs(["Necklaces", "Earrings", "Bangles & Bracelets", "Rings", "Artificial Jewellery Sets"]) },
  { name: "Beauty & Health", slug: "beauty-health", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80", enabled: true, order: 6, subcategories: toSubs(["Makeup", "Skincare", "Hair Care", "Fragrances", "Personal Care"]) },
  { name: "Home & Kitchen", slug: "home-kitchen", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=80", enabled: true, order: 7, subcategories: toSubs(["Home Decor", "Kitchen Tools", "Bedding", "Storage", "Lighting"]) },
  { name: "Electronics", slug: "electronics", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80", enabled: true, order: 8, subcategories: toSubs(["Headphones", "Smart Watches", "Mobile Accessories", "Power Banks", "Speakers"]) },
  { name: "Sports & Fitness", slug: "sports-fitness", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=600&q=80", enabled: true, order: 9, subcategories: toSubs(["Activewear", "Yoga", "Gym Accessories", "Sports Shoes", "Outdoor"]) }
];

const womenProductsData = [
  {
    title: "Gucci Floral Silk Chiffon Maxi Dress",
    description: "Elegant floor-length silk chiffon maxi dress with vibrant floral prints, delicate ruffle trims, and a cinched waistline.",
    categoryName: "Dresses & Gowns", subcategory: "Maxi Dresses", brand: "Gucci", mrp: 4999, salePrice: 2999,
    colors: ["Pastel Pink", "Floral White"], sizes: ["XS", "S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 142
  },
  {
    title: "Prada Velvet Evening Cocktail Bodycon Dress",
    description: "Sophisticated black velvet bodycon dress featuring a sweetheart neckline and side slit silhouette.",
    categoryName: "Dresses & Gowns", subcategory: "Cocktail Dresses", brand: "Prada", mrp: 5999, salePrice: 3499,
    colors: ["Classic Black", "Emerald Green"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: false, rating: 4.8, reviewCount: 98
  },
  {
    title: "Mango Silk Satin Button-Down Blouse",
    description: "Luxurious silk-touch satin blouse featuring a relaxed fit, spread collar, and mother-of-pearl buttons.",
    categoryName: "Tops & Tees", subcategory: "Satin Blouses", brand: "Mango", mrp: 2499, salePrice: 1399,
    colors: ["Ivory White", "Lavender"], sizes: ["XS", "S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: false, bestSeller: true, rating: 4.6, reviewCount: 110
  },
  {
    title: "Tanishq Designer Organza Floral Saree with Blouse",
    description: "Breathtaking pastel pink organza saree decorated with delicate floral hand-embroidery.",
    categoryName: "Ethnic & Sarees", subcategory: "Designer Sarees", brand: "Tanishq", mrp: 7999, salePrice: 4499,
    colors: ["Blush Pink", "Mint Green"], sizes: ["Free Size"],
    images: ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 215
  },
  {
    title: "Levi's High-Waisted Flare Denim Jeans",
    description: "Iconic high-waisted vintage denim jeans with an elongated bootcut flare hem.",
    categoryName: "Bottoms & Jeans", subcategory: "High-Waist Jeans", brand: "Levi's", mrp: 3499, salePrice: 2199,
    colors: ["Indigo Blue", "Washed Black"], sizes: ["26", "28", "30", "32"],
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80"],
    featured: false, trending: true, bestSeller: true, rating: 4.7, reviewCount: 156
  },
  {
    title: "Tommy Hilfiger Tailored Double-Breasted Blazer",
    description: "Structured double-breasted blazer featuring sharp lapels and engraved gold crest buttons.",
    categoryName: "Jackets & Shrugs", subcategory: "Blazers", brand: "Tommy Hilfiger", mrp: 5499, salePrice: 3299,
    colors: ["Navy Blue", "Camel Brown"], sizes: ["S", "M", "L"],
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: false, rating: 4.8, reviewCount: 77
  },
  {
    title: "Aldo Satin Strappy Stiletto Pumps",
    description: "Glamorous 4-inch stiletto pumps wrapped in glossy satin with delicate ankle straps.",
    categoryName: "Footwear & Heels", subcategory: "Stiletto Heels", brand: "Aldo", mrp: 4299, salePrice: 2499,
    colors: ["Nude Beige", "Ruby Red"], sizes: ["UK 4", "UK 5", "UK 6", "UK 7"],
    images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.8, reviewCount: 112
  },
  {
    title: "Michael Kors Quilted Leather Chain Shoulder Bag",
    description: "Iconic quilted lambskin shoulder bag decorated with gold-tone hardware and chain strap.",
    categoryName: "Bags & Accessories", subcategory: "Handbags", brand: "Michael Kors", mrp: 6999, salePrice: 4199,
    colors: ["Classic Black", "Blush Cream"], sizes: ["One Size"],
    images: ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80"],
    featured: true, trending: true, bestSeller: true, rating: 4.9, reviewCount: 204
  }
];

const generateProducts = (categoriesMap) => {
  const products = [];
  const brands = {
    Women: ["Zentro", "Biba", "Zara", "Mango", "Only"],
    Men: ["Levi's", "Roadster", "HRX", "Allen Solly", "Nike"],
    Kids: ["Carter's", "Mothercare", "Gini & Jony", "Max"],
    Footwear: ["Bata", "Nike", "Adidas", "Aldo", "Puma"],
    "Bags & Luggage": ["Wildcraft", "Caprese", "Lavie", "Safari"],
    Jewellery: ["Giva", "Swarovski", "Voylla", "Tanishq"],
    "Beauty & Health": ["Maybelline", "Lakme", "Nivea", "Dove"],
    "Home & Kitchen": ["Solimo", "Wakefit", "Home Centre"],
    Electronics: ["boAt", "Noise", "JBL", "Mi"],
    "Sports & Fitness": ["Nike", "Adidas", "Puma", "HRX"]
  };

  const colors = ["Black", "White", "Navy Blue", "Red", "Olive Green", "Beige", "Charcoal Grey", "Silver", "Gold", "Rose Gold"];
  const sizes = {
    Women: ["XS", "S", "M", "L", "XL"],
    Men: ["S", "M", "L", "XL", "XXL"],
    Kids: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    Footwear: ["UK 4", "UK 5", "UK 6", "UK 7", "UK 8"],
    "Bags & Luggage": ["One Size"],
    Jewellery: ["One Size"],
    "Beauty & Health": ["One Size"],
    "Home & Kitchen": ["One Size"],
    Electronics: ["One Size"],
    "Sports & Fitness": ["S", "M", "L", "One Size"]
  };

  const images = {
    Women: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80"
    ],
    Men: [
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80"
    ],
    Kids: [
      "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1471286174243-e7a4dbf0b7c1?auto=format&fit=crop&w=600&q=80"
    ],
    Footwear: [
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1603487742131-4160ec999306?auto=format&fit=crop&w=600&q=80"
    ],
    "Bags & Luggage": [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=80"
    ],
    Jewellery: [
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80"
    ],
    "Beauty & Health": [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80"
    ],
    "Home & Kitchen": [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80"
    ],
    Electronics: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80"
    ],
    "Sports & Fitness": [
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80"
    ]
  };

  let productCounter = 1;

  categoriesData.forEach(cat => {
    const categoryId = categoriesMap[cat.name];
    if (!categoryId) return;

    const brandList = brands[cat.name] || ["Zentro"];
    const sizeList = sizes[cat.name] || ["S", "M", "L"];
    const productImages = images[cat.name] || images.Women;

    // ~2 products × 4 subs × 8 cats ≈ 64
    cat.subcategories.forEach((subRaw, subIdx) => {
      const sub = typeof subRaw === "string" ? subRaw : subRaw?.name;
      if (!sub) return;
      const selectedBrand = brandList[subIdx % brandList.length];
      const numProductsInSub = cat.subcategories.length === 4 ? 2 : 1;
      for (let i = 0; i < numProductsInSub; i++) {
        const itemNumber = productCounter++;
        const mrp = Math.round((500 + Math.random() * 4500) / 100) * 100 + 99;
        const salePrice = Math.round((mrp * (0.4 + Math.random() * 0.4)) / 100) * 100 + 99;
        const slugBase = `${selectedBrand} Premium ${sub} Style ${itemNumber}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 80);

        products.push({
          title: `${selectedBrand} Premium ${sub.replace(/s$/, "")} - Style ${itemNumber}`,
          slug: `${slugBase}-${itemNumber}`,
          description: `Experience ultimate comfort and exquisite style with this premium product from ${selectedBrand}. Designed with high-quality materials and meticulous attention to detail for the modern wardrobe.`,
          sku: `SKU-AUTO-${String(1000 + itemNumber)}`,
          mrp,
          salePrice,
          discount: Math.max(0, Math.round(((mrp - salePrice) / mrp) * 100)),
          brand: selectedBrand,
          rating: Number((3.8 + Math.random() * 1.2).toFixed(1)),
          reviewCount: Math.floor(10 + Math.random() * 240),
          specifications: [
            { name: "Material", value: "Premium fabric / finish" },
            { name: "Occasion", value: "Casual & Semi-Formal" },
            { name: "Fit", value: "Regular / Comfort Fit" },
            { name: "Origin", value: "Made in India" }
          ],
          colors: [colors[itemNumber % colors.length], colors[(itemNumber + 2) % colors.length]],
          sizes: sizeList,
          images: [
            productImages[itemNumber % productImages.length],
            productImages[(itemNumber + 1) % productImages.length],
            productImages[(itemNumber + 2) % productImages.length]
          ],
          videoUrl: "",
          view360Images: [
            productImages[itemNumber % productImages.length],
            productImages[(itemNumber + 1) % productImages.length],
            productImages[(itemNumber + 2) % productImages.length]
          ],
          stock: Math.floor(20 + Math.random() * 150),
          category: categoryId,
          subcategory: sub,
          tags: [cat.name.toLowerCase(), sub.toLowerCase(), selectedBrand.toLowerCase(), "Zentro", "fashion"],
          status: "published",
          featured: itemNumber % 7 === 0,
          trending: itemNumber % 5 === 0,
          bestSeller: itemNumber % 6 === 0,
          latest: itemNumber % 4 === 0,
          newArrival: itemNumber % 3 === 0,
          offerProduct: itemNumber % 8 === 0
        });
      }
    });
  });

  return products;
};

export const seedDatabase = async (force = false) => {
  try {
    if (force) {
      await Category.deleteMany({});
      await Product.deleteMany({});
      await Coupon.deleteMany({});
      console.log("> Purged existing categories, products, and coupons for force re-seed");
    }

    // 1. Check if WebsiteSettings already exist
    let settings = await WebsiteSettings.findOne();
    if (!settings) {
      settings = await WebsiteSettings.create({
        theme: "system",
        seo: {
          title: "Zentro | Shop Everything",
          metaDescription: "Zentro marketplace for men, women, kids, home, beauty, electronics and everyday essentials.",
          ogImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
          keywords: ["zentro", "marketplace", "fashion", "electronics", "home", "beauty"]
        },
        bannerImages: [
          "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80"
        ],
        heroSlider: [
          {
            image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80",
            title: "Summer Haute Couture",
            subtitle: "Exclusive 50% Off On Selected Designer Wear",
            link: "/search?category=Women"
          },
          {
            image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
            title: "Dapper Classics For Men",
            subtitle: "Redefine Your Wardrobe Staples With Premium Materials",
            link: "/search?category=Men"
          }
        ],
        footerDetails: {
          contactEmail: "support@zentro.com",
          contactPhone: "+91 9999999999",
          address: "123 Commerce St, Mumbai, India"
        }
      });
      console.log("> Seeded Website Settings");
    } else {
      // Migrate legacy Kirnya/Valois branding to Zentro without wiping catalog
      settings.seo = {
        ...(settings.seo?.toObject?.() || settings.seo || {}),
        title: "Zentro | Shop Everything",
        metaDescription:
          String(settings.seo?.metaDescription || "").includes("Zentro")
            ? settings.seo.metaDescription
            : "Zentro marketplace for men, women, kids, home, beauty, electronics and everyday essentials.",
        keywords: ["zentro", "marketplace", "fashion", "electronics", "home", "beauty"]
      };
      const email = String(settings.footerDetails?.contactEmail || "").toLowerCase();
      settings.footerDetails = {
        ...(settings.footerDetails?.toObject?.() || settings.footerDetails || {}),
        contactEmail:
          email.includes("kirnya") || email.includes("valois") || !email
            ? "support@zentro.com"
            : settings.footerDetails.contactEmail,
        address:
          String(settings.footerDetails?.address || "").toLowerCase().includes("fashion")
            ? "123 Commerce St, Mumbai, India"
            : settings.footerDetails?.address || "123 Commerce St, Mumbai, India"
      };
      await settings.save();
      console.log("> Updated Website Settings branding to Zentro");
    }

    // 2. Check if Categories exist
    const categoryCount = await Category.countDocuments();
    let categoriesMap = {};
    if (categoryCount === 0) {
      const seededCats = await Category.insertMany(categoriesData);
      seededCats.forEach(c => {
        categoriesMap[c.name] = c._id;
      });
      console.log("> Seeded Categories");
    } else {
      const currentCats = await Category.find();
      currentCats.forEach(c => {
        categoriesMap[c.name] = c._id;
      });
    }

    // 3. Check if Products exist
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      const generatedProductsList = generateProducts(categoriesMap);
      await Product.insertMany(generatedProductsList);
      console.log(`> Seeded ${generatedProductsList.length} Products`);
    }

    // 4. Seed Default Users if none exist
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const adminEmail = process.env.ADMIN_EMAIL || "dlpfjdr@gmail.com";
      const defaultHashedPassword = crypto.createHash("sha256").update("password123" + "valois-salt-string").digest("hex");

      await User.insertMany([
        {
          name: "ZENTRO Owner",
          email: "dlpfjdr@gmail.com",
          mobile: "+918888888888",
          role: "Owner",
          walletBalance: 100000,
          password: defaultHashedPassword
        },
        {
          name: "ZENTRO Admin",
          email: adminEmail === "dlpfjdr@gmail.com" ? "admin@ZENTRO.com" : adminEmail,
          mobile: "+919999999999",
          role: "Admin",
          walletBalance: 50000,
          password: defaultHashedPassword
        },
        {
          name: "Express Delivery",
          email: "delivery@ZENTRO.com",
          mobile: "+917777777777",
          role: "Delivery Partner",
          walletBalance: 500,
          password: defaultHashedPassword
        },
        {
          name: "Demo Customer",
          email: "customer@ZENTRO.com",
          mobile: "+916666666666",
          role: "Customer",
          walletBalance: 1500,
          password: defaultHashedPassword
        }
      ]);
      console.log("> Seeded Default Users with default password: password123");
    }

    // 5. Seed Default Coupons
    const couponCount = await Coupon.countDocuments();
    if (couponCount === 0) {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 6); // Valid for 6 months

      await Coupon.insertMany([
        {
          code: "ZentroNEW",
          discountType: "Percentage",
          value: 20,
          minPurchase: 1499,
          maxDiscount: 500,
          expiryDate: expiry
        },
        {
          code: "ZENTRONEW",
          discountType: "Percentage",
          value: 20,
          minPurchase: 1499,
          maxDiscount: 500,
          expiryDate: expiry
        },
        {
          code: "WELCOME10",
          discountType: "Percentage",
          value: 10,
          minPurchase: 999,
          maxDiscount: 200,
          expiryDate: expiry
        },
        {
          code: "FESTIVE500",
          discountType: "Fixed",
          value: 500,
          minPurchase: 3999,
          expiryDate: expiry
        }
      ]);
      console.log("> Seeded Default Coupons");
    }
    // Role override workaround for developer email to make them Owner directly
    await User.findOneAndUpdate(
      { email: "dlpfjdr@gmail.com" },
      { role: "Owner" }
    );
    console.log("> Overrode role for dlpfjdr@gmail.com to Owner");

    console.log("> Seeding verification complete. Ready.");
  } catch (error) {
    console.error("> Seeding failed:", error);
  }
};
