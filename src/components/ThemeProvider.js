"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Toaster } from "react-hot-toast";
import PermissionOnboarding from "./PermissionOnboarding.js";
import { setStorefrontSettings } from "../store/slices/settingsSlice.js";
import api from "../utils/api.js";

export function ThemeProvider({ children }) {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.settings.theme) || "system";

  useEffect(() => {
    let cancelled = false;
    api
      .get("/admin/settings")
      .then((res) => {
        if (!cancelled && res.data?.success && res.data.settings) {
          dispatch(setStorefrontSettings(res.data.settings));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (selectedTheme) => {
      root.classList.remove("light", "dark");

      if (selectedTheme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        root.classList.add(systemTheme);
      } else {
        root.classList.add(selectedTheme);
      }
    };

    applyTheme(theme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  return (
    <>
      {children}
      <PermissionOnboarding />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--background)",
            color: "var(--foreground)",
            border: "1px solid rgba(0,0,0,0.1)",
            backdropFilter: "blur(8px)"
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#ffffff"
            }
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#ffffff"
            }
          }
        }}
      />
    </>
  );
}
