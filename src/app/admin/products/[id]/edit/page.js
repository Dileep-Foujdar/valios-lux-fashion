"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Navbar from "../../../../../components/Navbar.js";
import Footer from "../../../../../components/Footer.js";
import ProductForm from "../../../../../components/admin/ProductForm.js";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }
    if (!["Admin", "Owner", "Super Admin"].includes(user?.role)) {
      router.push("/");
    }
  }, [isAuthenticated, user, router]);

  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] bg-zinc-50 dark:bg-black">
        <ProductForm mode="edit" productId={params.id} />
      </main>
      <Footer />
    </>
  );
}
