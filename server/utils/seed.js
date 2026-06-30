import crypto from "crypto";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import WebsiteSettings from "../models/WebsiteSettings.js";

const categoriesData = [
  { name: "Men", slug: "men", image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80", subcategories: ["Shirts", "T-Shirts", "Jeans", "Jackets", "Suits"] },
  { name: "Women", slug: "women", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80", subcategories: ["Dresses", "Tops", "Jeans", "Ethnic Wear", "Cardigans"] },
  { name: "Kids", slug: "kids", image: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=600&q=80", subcategories: ["T-Shirts", "Dresses", "Pants", "Toys"] },
  { name: "Shoes", slug: "shoes", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80", subcategories: ["Sneakers", "Formal Shoes", "Boots", "Heels", "Sandals"] },
  { name: "Accessories", slug: "accessories", image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80", subcategories: ["Belts", "Wallets", "Sunglasses", "Hats", "Scarves"] },
  { name: "Watches", slug: "watches", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=80", subcategories: ["Analog", "Chronograph", "Smart Watches", "Luxury Watches"] },
  { name: "Bags", slug: "bags", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80", subcategories: ["Handbags", "Backpacks", "Clutches", "Luggage"] },
  { name: "Jewellery", slug: "jewellery", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80", subcategories: ["Necklaces", "Earrings", "Rings", "Bracelets"] },
  { name: "Beauty", slug: "beauty", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80", subcategories: ["Skincare", "Makeup", "Fragrances", "Haircare"] }
];

const generateProducts = (categoriesMap) => {
  const products = [];
  const brands = {
    Men: ["Zara", "H&M", "Tommy Hilfiger", "Calvin Klein", "Levi's"],
    Women: ["Gucci", "Prada", "Vero Moda", "Only", "Mango"],
    Kids: ["Carter's", "Mothercare", "Gini & Jony", "Adidas Kids"],
    Shoes: ["Nike", "Adidas", "Puma", "Bata", "Aldo"],
    Accessories: ["Fossil", "Ray-Ban", "Oakley", "Montblanc"],
    Watches: ["Rolex", "Seiko", "Casio", "Titan", "Fossil"],
    Bags: ["Louis Vuitton", "Michael Kors", "Caprese", "Samsonite", "Wildcraft"],
    Jewellery: ["Tiffany & Co.", "Tanishq", "Giva", "Swarovski"],
    Beauty: ["L'Oreal", "MAC", "Estee Lauder", "Maybelline", "Clinique"]
  };

  const colors = ["Black", "White", "Navy Blue", "Red", "Olive Green", "Beige", "Charcoal Grey", "Silver", "Gold", "Rose Gold"];
  const sizes = {
    Men: ["S", "M", "L", "XL", "XXL"],
    Women: ["XS", "S", "M", "L", "XL"],
    Kids: ["2-3 Y", "4-5 Y", "6-7 Y", "8-9 Y"],
    Shoes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    Accessories: ["FS"],
    Watches: ["FS"],
    Bags: ["Medium", "Large"],
    Jewellery: ["FS"],
    Beauty: ["FS"]
  };

  const images = {
    Men: [
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1505022610485-0249ba5b3675?auto=format&fit=crop&w=600&q=80"
    ],
    Women: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80"
    ],
    Kids: [
      "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1471286174243-e7a4dbf0b7c1?auto=format&fit=crop&w=600&q=80"
    ],
    Shoes: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80"
    ],
    Accessories: [
      "https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=600&q=80"
    ],
    Watches: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=600&q=80"
    ],
    Bags: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=80"
    ],
    Jewellery: [
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80"
    ],
    Beauty: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80"
    ]
  };

  let productCounter = 1;

  categoriesData.forEach(cat => {
    const categoryId = categoriesMap[cat.name];

    // Create 6 items per category to reach 54 products total
    cat.subcategories.forEach((sub, subIdx) => {
      const brandList = brands[cat.name];
      const selectedBrand = brandList[subIdx % brandList.length];

      const numProductsInSub = cat.subcategories.length === 4 ? 2 : 1;
      for (let i = 0; i < numProductsInSub; i++) {
        const itemNumber = productCounter++;
        const mrp = Math.round((500 + Math.random() * 4500) / 100) * 100 + 99; // 599 to 4999
        const salePrice = Math.round((mrp * (0.4 + Math.random() * 0.4)) / 100) * 100 + 99; // 40% to 80% of MRP

        const productImages = images[cat.name];

        products.push({
          title: `${selectedBrand} Premium ${sub.substring(0, sub.length - (sub.endsWith("s") ? 1 : 0))} - Style ${itemNumber}`,
          description: `Experience ultimate comfort and exquisite style with this premium product from ${selectedBrand}. Designed with high-quality materials and meticulous attention to detail, this item elevates your daily wardrobe effortlessly. Features modern fits, lightweight build, and luxury aesthetics. Perfect for styling across seasons.`,
          sku: `SKU-${cat.name.substring(0, 3).toUpperCase()}-${sub.substring(0, 3).toUpperCase()}-${1000 + itemNumber}`,
          mrp,
          salePrice,
          brand: selectedBrand,
          rating: Number((3.8 + Math.random() * 1.2).toFixed(1)),
          reviewCount: Math.floor(10 + Math.random() * 240),
          specifications: [
            { name: "Material", value: cat.name === "Shoes" ? "Genuine Leather / Mesh" : cat.name === "Beauty" ? "Natural Extracts" : "Premium Cotton Blend" },
            { name: "Occasion", value: "Casual & Semi-Formal" },
            { name: "Fit", value: "Regular / Comfort Fit" },
            { name: "Origin", value: "Made in India" }
          ],
          colors: [colors[itemNumber % colors.length], colors[(itemNumber + 2) % colors.length]],
          sizes: sizes[cat.name],
          images: [
            productImages[itemNumber % productImages.length],
            productImages[(itemNumber + 1) % productImages.length],
            productImages[(itemNumber + 2) % productImages.length]
          ],
          videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-with-silver-glitter-makeup-40097-large.mp4",
          view360Images: [
            productImages[itemNumber % productImages.length],
            productImages[(itemNumber + 1) % productImages.length],
            productImages[(itemNumber + 2) % productImages.length]
          ],
          stock: Math.floor(20 + Math.random() * 150),
          category: categoryId,
          subcategory: sub,
          tags: [cat.name.toLowerCase(), sub.toLowerCase(), selectedBrand.toLowerCase(), "luxury", "fashion", "valois"],
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
          title: "VALOIS Luxury Fashion Store",
          metaDescription: "Discover premium apparel, footwear, watches, and beauty essentials from global designers. Safe & fast deliveries.",
          ogImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
          keywords: ["fashion", "luxury", "clothing", "valois", "shoes", "watches"]
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
        ]
      });
      console.log("> Seeded Website Settings");
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
          name: "Valois Owner",
          email: "dlpfjdr@gmail.com",
          mobile: "+918888888888",
          role: "Owner",
          walletBalance: 100000,
          password: defaultHashedPassword
        },
        {
          name: "Valois Admin",
          email: adminEmail === "dlpfjdr@gmail.com" ? "admin@valois.com" : adminEmail,
          mobile: "+919999999999",
          role: "Admin",
          walletBalance: 50000,
          password: defaultHashedPassword
        },
        {
          name: "Express Delivery",
          email: "delivery@valois.com",
          mobile: "+917777777777",
          role: "Delivery Partner",
          walletBalance: 500,
          password: defaultHashedPassword
        },
        {
          name: "Demo Customer",
          email: "customer@valois.com",
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
          code: "VALOISNEW",
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
