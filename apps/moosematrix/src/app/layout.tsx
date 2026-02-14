import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { NavbarStatic, FooterStatic } from "@moosematrix/ui";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "The Moose Matrix",
  description: "A security-first ecosystem of tools, writing, and products.",
  metadataBase: new URL("https://moosematrix.com"),
  icons: { icon: "/moose.png" },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

const BUILD_YEAR = (() => {
  const raw = process.env.MOOSE_BUILD_YEAR || process.env.NEXT_PUBLIC_BUILD_YEAR || "";
  const n = Number(raw);
  return Number.isFinite(n) ? n : new Date().getFullYear();
})();

/**
 * Reads a non-HttpOnly cookie `mm-theme=light|dark` and sets:
 *   <html data-theme="light|dark">
 * If cookie missing or set=system, removes the attribute so system preference wins.
 */
const THEME_INIT = `
(() => {
  try {
    const m = document.cookie.match(/(?:^|; )mm-theme=([^;]+)/);
    if (!m) return;
    const v = decodeURIComponent(m[1]);
    if (v === "light" || v === "dark") {
      document.documentElement.dataset.theme = v;
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  } catch {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <Script id="mm-theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
      </head>

      <body className="min-h-screen antialiased">
        <NavbarStatic />
        <div id="content">{children}</div>
        <FooterStatic year={BUILD_YEAR} />
      </body>
    </html>
  );
}
