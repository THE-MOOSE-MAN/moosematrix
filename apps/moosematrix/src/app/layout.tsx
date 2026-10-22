// layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FooterStatic } from "@moosematrix/ui";
import { SiteNav } from "../components/SiteNav";

export const metadata: Metadata = {
  title: "The Moose Matrix",
  description: "A hub for projects, writing, and products.",
  metadataBase: new URL("https://moosematrix.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "The Moose Matrix",
    description: "A hub for projects, writing, and products.",
    url: "https://moosematrix.com",
    siteName: "The Moose Matrix",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Moose Matrix" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Moose Matrix",
    description: "A hub for projects, writing, and products.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  // A3: let the layout reach the screen edges on notched phones; header, hero and footer pad with
  // env(safe-area-inset-*) so nothing sits under the notch or the home indicator.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#070b13" },
  ],
};

// Theme choice is shared across *.moosematrix.com via the mm-theme cookie (Domain=.moosematrix.com).
// If a legacy host-only cookie also exists, the last (newest) value wins and is migrated to the shared cookie.
const THEME_INIT = `(() => {
  try {
    const vals = [...document.cookie.matchAll(/(?:^|;\\s*)mm-theme=([^;]*)/g)].map((m) => decodeURIComponent(m[1]));
    const v = vals.length ? vals[vals.length - 1] : "system";
    const mode = v === "light" || v === "dark" ? v : "system";
    const r = document.documentElement;
    if (mode !== "system") r.dataset.theme = mode;
    else r.removeAttribute("data-theme");
    const h = location.hostname;
    if (vals.length && (h === "moosematrix.com" || h.endsWith(".moosematrix.com"))) {
      document.cookie = "mm-theme=; Path=/; Max-Age=0; SameSite=Lax";
      document.cookie = mode === "system"
        ? "mm-theme=; Domain=.moosematrix.com; Path=/; Max-Age=0; SameSite=Lax; Secure"
        : "mm-theme=" + mode + "; Domain=.moosematrix.com; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
    }
    if (mode !== "system") {
      // Override the scheme-specific theme-color metas without touching React-managed tags (avoids a
      // hydration mismatch): the first matching theme-color in document order wins.
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = mode === "dark" ? "#070b13" : "#f7f6f3";
      meta.id = "mm-theme-color";
      document.head.prepend(meta);
    }
  } catch {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Plain inline script (not next/script): runs while <head> is parsed, before first paint, so the
            saved theme never flashes. next/script "beforeInteractive" queues it until the runtime boots. */}
        <script id="mm-theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-svh antialiased flex flex-col overflow-x-hidden">
        {/* Skip link first in the tab order; target is the one <main> below (pages render no <main> of their own). */}
        <a href="#content" className="mm-skip-link">Skip to content</a>
        <SiteNav />
        <main id="content" tabIndex={-1} className="flex-1">{children}</main>
        <FooterStatic />
      </body>
    </html>
  );
}
