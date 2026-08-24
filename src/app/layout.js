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
  title: "Kirnya | Premium Fashion Brand",
  description: "Experience Kirnya's luxury fashion clothing, shoes, watches, and accessories.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.png",
    apple: "/logo.png",
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
