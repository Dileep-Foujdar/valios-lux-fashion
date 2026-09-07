"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { IoLogoFacebook, IoLogoInstagram, IoLogoTwitter, IoArrowForward } from "react-icons/io5";
import toast from "react-hot-toast";

const Footer = () => {
  const footerDetails = useSelector((state) => state.settings.footerDetails) || {
    contactEmail: "support@zentro.com",
    contactPhone: "+91 9999999999",
    address: "123 Commerce St, Mumbai, India"
  };

  const [newsletterEmail, setNewsletterEmail] = useState("");

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim() && newsletterEmail.includes("@")) {
      toast.success("Successfully subscribed to Zentro Newsletter! Check your inbox.");
      setNewsletterEmail("");
    } else {
      toast.error("Please enter a valid email address.");
    }
  };

  return (
    <footer className="w-full border-t border-zinc-100 bg-zinc-50 transition-colors dark:border-zinc-900 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="inline-flex items-start overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-navbar.png?v=6"
                alt="Zentro"
                className="h-40 w-auto max-w-[180px] object-contain object-left"
              />
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Zentro is your everyday marketplace for men, women, kids, home, beauty, and more —
              quality finds at great prices.
            </p>
            <div className="mt-2 flex gap-4 text-lg text-zinc-400 dark:text-zinc-500">
              <a href="#" className="transition-colors hover:text-brand-purple">
                <IoLogoFacebook />
              </a>
              <a href="#" className="transition-colors hover:text-brand-purple">
                <IoLogoInstagram />
              </a>
              <a href="#" className="transition-colors hover:text-brand-purple">
                <IoLogoTwitter />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-white">
              Categories
            </h4>
            <div className="flex flex-col gap-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <Link href="/search?category=Women" className="transition-colors hover:text-brand-purple">
                Women
              </Link>
              <Link href="/search?category=Men" className="transition-colors hover:text-brand-purple">
                Men
              </Link>
              <Link href="/search?category=Kids" className="transition-colors hover:text-brand-purple">
                Kids
              </Link>
              <Link
                href="/search?category=Home%20%26%20Kitchen"
                className="transition-colors hover:text-brand-purple"
              >
                Home & Kitchen
              </Link>
              <Link
                href="/search?category=Electronics"
                className="transition-colors hover:text-brand-purple"
              >
                Electronics
              </Link>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-white">
              Customer Support
            </h4>
            <div className="flex flex-col gap-3 text-xs font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
              <p>
                <strong>Address:</strong>
                <br />
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

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-white">
              Newsletter
            </h4>
            <p className="mb-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Sign up for deals, new arrivals, and updates from Zentro.
            </p>
            <form onSubmit={handleSubscribe} className="relative flex items-center">
              <input
                type="email"
                placeholder="Your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="w-full rounded-full border border-zinc-200 bg-white py-2.5 pl-4 pr-10 text-xs font-semibold outline-none focus:border-brand-purple dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-brand-purple"
              />
              <button
                type="submit"
                className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white hover:opacity-90"
              >
                <IoArrowForward className="text-sm" />
              </button>
            </form>
          </div>
        </div>

        <hr className="my-10 border-zinc-100 dark:border-zinc-900" />

        <div className="flex flex-col items-center justify-between gap-4 text-center text-[11px] font-medium text-zinc-400 dark:text-zinc-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Zentro. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">
              Privacy Policy
            </a>
            <a href="#" className="hover:underline">
              Terms of Service
            </a>
            <a href="#" className="hover:underline">
              Sitemap
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
