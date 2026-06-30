import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import crypto from "crypto";

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
  { name: "Men", slug: "men", image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80", subcategories: ["Shirts","T-Shirts","Jeans","Jackets","Suits"] },
  { name: "Women", slug: "women", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80", subcategories: ["Dresses","Tops","Jeans","Ethnic Wear","Cardigans"] },
  { name: "Kids", slug: "kids", image: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=600&q=80", subcategories: ["T-Shirts","Dresses","Pants","Toys"] },
  { name: "Shoes", slug: "shoes", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80", subcategories: ["Sneakers","Formal Shoes","Boots","Heels","Sandals"] },
  { name: "Accessories", slug: "accessories", image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80", subcategories: ["Belts","Wallets","Sunglasses","Hats","Scarves"] },
  { name: "Watches", slug: "watches", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=80", subcategories: ["Analog","Chronograph","Smart Watches","Luxury Watches"] },
  { name: "Bags", slug: "bags", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80", subcategories: ["Handbags","Backpacks","Clutches","Luggage"] },
  { name: "Jewellery", slug: "jewellery", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80", subcategories: ["Necklaces","Earrings","Rings","Bracelets"] },
  { name: "Beauty", slug: "beauty", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80", subcategories: ["Skincare","Makeup","Fragrances","Haircare"] },
];

const brands = {
  Men: ["Zara","H&M","Tommy Hilfiger","Calvin Klein","Levis"],
  Women: ["Gucci","Prada","Vero Moda","Only","Mango"],
  Kids: ["Carters","Mothercare","Gini Jony","Adidas Kids"],
  Shoes: ["Nike","Adidas","Puma","Bata","Aldo"],
  Accessories: ["Fossil","Ray-Ban","Oakley","Montblanc"],
  Watches: ["Rolex","Seiko","Casio","Titan","Fossil"],
  Bags: ["Louis Vuitton","Michael Kors","Caprese","Samsonite","Wildcraft"],
  Jewellery: ["Tiffany Co","Tanishq","Giva","Swarovski"],
  Beauty: ["LOreal","MAC","Estee Lauder","Maybelline","Clinique"],
};

const colors = ["Black","White","Navy Blue","Red","Olive Green","Beige","Charcoal Grey","Silver","Gold","Rose Gold"];
const sizeMap = {
  Men:["S","M","L","XL","XXL"], Women:["XS","S","M","L","XL"], Kids:["2-3Y","4-5Y","6-7Y","8-9Y"],
  Shoes:["UK6","UK7","UK8","UK9","UK10"], Accessories:["FS"], Watches:["FS"],
  Bags:["Medium","Large"], Jewellery:["FS"], Beauty:["FS"],
};

const imageMap = {
  Men:["https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1598032895397-b9472444bf93?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=600&q=80"],
  Women:["https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80"],
  Kids:["https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?auto=format&fit=crop&w=600&q=80"],
  Shoes:["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80"],
  Accessories:["https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1509695507497-903c140c43b0?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80"],
  Watches:["https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1537944434965-cf4679d1a598?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1548169874-53e85f753f1e?auto=format&fit=crop&w=600&q=80"],
  Bags:["https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80"],
  Jewellery:["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=600&q=80"],
  Beauty:["https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=600&q=80","https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80"],
};

console.log("> Purging old data...");
await Category.deleteMany({});
await Product.deleteMany({});
await Coupon.deleteMany({});

const seededCats = await Category.insertMany(categoriesData);
const catMap = {};
seededCats.forEach(c => { catMap[c.name] = c._id; });
console.log("> Inserted", seededCats.length, "categories.");

const products = [];
let idx = 1;
for (const cat of categoriesData) {
  const catBrands = brands[cat.name];
  const catImages = imageMap[cat.name];
  const catSizes  = sizeMap[cat.name];
  for (let s = 0; s < cat.subcategories.length; s++) {
    const sub = cat.subcategories[s];
    for (let p = 0; p < 2; p++) {
      const brand = catBrands[idx % catBrands.length];
      const mrp = Math.round((800 + Math.random() * 4200) / 100) * 100 + 99;
      const salePrice = Math.round((mrp * (0.4 + Math.random() * 0.4)) / 100) * 100 + 99;
      const imgs = [catImages[idx % catImages.length], catImages[(idx+1)%catImages.length], catImages[(idx+2)%catImages.length]];
      products.push({
        title: brand + " Premium " + sub + " Edition " + idx,
        description: "Premium " + sub + " by " + brand + ". Crafted with luxury materials for unmatched comfort and style.",
        sku: cat.name.slice(0,3).toUpperCase() + "-" + sub.slice(0,3).toUpperCase() + "-" + (1000+idx),
        mrp, salePrice, brand,
        rating: Number((3.8 + Math.random()*1.2).toFixed(1)),
        reviewCount: Math.floor(12 + Math.random()*220),
        specifications: [
          { name: "Material", value: cat.name==="Shoes" ? "Genuine Leather" : cat.name==="Beauty" ? "Natural Extracts" : "Premium Cotton" },
          { name: "Occasion", value: "Casual & Semi-Formal" },
          { name: "Fit", value: "Regular Fit" },
          { name: "Origin", value: "Made in India" }
        ],
        colors: [colors[idx%colors.length], colors[(idx+3)%colors.length]],
        sizes: catSizes,
        images: imgs, videoUrl: "", view360Images: imgs,
        stock: Math.floor(20 + Math.random()*150),
        category: catMap[cat.name],
        subcategory: sub,
        tags: [cat.name.toLowerCase(), sub.toLowerCase(), brand.toLowerCase(), "luxury","fashion","valois"],
        featured: idx%7===0,
        trending: idx%5===0 || idx<=10,
        bestSeller: idx%6===0 || idx<=8,
        latest: idx%4===0,
        newArrival: idx%3===0,
        offerProduct: idx%8===0,
        isActive: true,
      });
      idx++;
    }
  }
}

await Product.insertMany(products);
console.log("> Inserted", products.length, "products!");

const expiry = new Date(); expiry.setMonth(expiry.getMonth()+6);
await Coupon.insertMany([
  { code:"VALOISNEW", discountType:"Percentage", value:20, minPurchase:1499, maxDiscount:500, expiryDate:expiry },
  { code:"WELCOME10", discountType:"Percentage", value:10, minPurchase:999, maxDiscount:200, expiryDate:expiry },
  { code:"FESTIVE500", discountType:"Fixed", value:500, minPurchase:3999, expiryDate:expiry },
]);
console.log("> Inserted coupons.");

const hash = crypto.createHash("sha256").update("password123valois-salt-string").digest("hex");
const existing = await User.findOne({ email:"dlpfjdr@gmail.com" });
if (!existing) {
  await User.create({ name:"Valois Owner", email:"dlpfjdr@gmail.com", mobile:"+918888888888", role:"Owner", walletBalance:100000, password:hash });
} else {
  await User.updateOne({ email:"dlpfjdr@gmail.com" }, { role:"Owner" });
}
console.log("> Owner confirmed.");

await mongoose.disconnect();
console.log("\nAll done! " + products.length + " products seeded into database.");
