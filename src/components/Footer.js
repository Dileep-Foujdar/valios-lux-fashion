"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { IoMailOutline, IoLogoFacebook, IoLogoInstagram, IoLogoTwitter, IoArrowForward } from "react-icons/io5";
import toast from "react-hot-toast";

const Footer = () => {
  const footerDetails = useSelector((state) => state.settings.footerDetails) || {
    contactEmail: "support@valois.com",
    contactPhone: "+91 9999999999",
    address: "123 Fashion St, Mumbai, India"
  };

  const [newsletterEmail, setNewsletterEmail] = useState("");

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim() && newsletterEmail.includes("@")) {
      toast.success("Successfully subscribed to Valois Newsletter! Check your inbox.");
      setNewsletterEmail("");
    } else {
      toast.error("Please enter a valid email address.");
    }
  };

  return (
    <footer className="w-full bg-zinc-50 border-t border-zinc-100 dark:bg-zinc-950 dark:border-zinc-900 transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Brand Col */}
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xl font-black text-black dark:text-white uppercase leading-none">VALOIS</span>
              <p className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">LUXURY STORE</p>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm">
              Discover curated luxury apparel and accessories selected from the world's finest design houses. Redefining modern apparel collections.
            </p>
            <div className="flex gap-4 mt-2 text-lg text-zinc-400 dark:text-zinc-500">
              <a href="#" className="hover:text-black dark:hover:text-white transition-colors"><IoLogoFacebook /></a>
              <a href="#" className="hover:text-black dark:hover:text-white transition-colors"><IoLogoInstagram /></a>
              <a href="#" className="hover:text-black dark:hover:text-white transition-colors"><IoLogoTwitter /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-widest mb-4">Categories</h4>
            <div className="flex flex-col gap-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <Link href="/search?category=Men" className="hover:text-black dark:hover:text-white transition-colors">Men's Apparel</Link>
              <Link href="/search?category=Women" className="hover:text-black dark:hover:text-white transition-colors">Women's Collection</Link>
              <Link href="/search?category=Shoes" className="hover:text-black dark:hover:text-white transition-colors">Premium Footwear</Link>
              <Link href="/search?category=Watches" className="hover:text-black dark:hover:text-white transition-colors">Luxury Watches</Link>
              <Link href="/search?category=Beauty" className="hover:text-black dark:hover:text-white transition-colors">Cosmetics & Beauty</Link>
            </div>
          </div>

          {/* Contact Col */}
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-widest mb-4">Customer Support</h4>
            <div className="flex flex-col gap-3 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              <p>
                <strong>Address:</strong><br />
                {footerDetails.address}
              </p>
              <p>
                <strong>Email:</strong> {footerDetails.contactEmail}
              </p>
              <p>
                <strong>Phone:</strong> {footerDetails.contactPhone}
              </p>
            </div>
          </div>

          {/* Newsletter Col */}
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-widest mb-4">Newsletter</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
              Sign up to receive early sale notifications, new arrivals catalogs, and luxury trend updates.
            </p>
            <form onSubmit={handleSubscribe} className="relative flex items-center">
              <input
                type="email"
                placeholder="Your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="w-full rounded-full border border-zinc-200 bg-white py-2.5 pl-4 pr-10 text-xs font-semibold outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-700 dark:text-white"
              />
              <button
                type="submit"
                className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-white hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                <IoArrowForward className="text-sm" />
              </button>
            </form>
          </div>

        </div>

        <hr className="border-zinc-100 my-10 dark:border-zinc-900" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
          <p>&copy; {new Date().getFullYear()} VALOIS Luxury Fashion. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">Sitemap</a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
