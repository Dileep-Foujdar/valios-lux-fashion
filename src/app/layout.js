import { Geist, Geist_Mono, Cormorant_Garamond, Great_Vibes } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "../store/provider.js";
import { ThemeProvider } from "../components/ThemeProvider.js";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displaySerif = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const scriptDisplay = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata = {
  title: "Zentro | Shop Everything",
  description: "Zentro — Men, Women, Kids, Home, Beauty & more. Shop fashion, electronics, and everyday essentials.",
  icons: {
    icon: [
      { url: "/favicon.png?v=5", type: "image/png", sizes: "512x512" },
      { url: "/icon.png?v=5", type: "image/png", sizes: "512x512" }
    ],
    shortcut: "/favicon.png?v=5",
    apple: "/favicon.png?v=5"
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${displaySerif.variable} ${scriptDisplay.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900 transition-colors duration-200 dark:bg-black dark:text-zinc-50">
        <ReduxProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
