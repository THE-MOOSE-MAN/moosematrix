// layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { NavbarStatic, FooterStatic } from "@moosematrix/ui";

export const metadata: Metadata = {
  title: "The Moose Matrix",
  description: "A hub for projects, writing, and products.",
  metadataBase: new URL("https://moosematrix.com"),
  icons: { icon: "/moose.png" },
  openGraph: {
    title: "The Moose Matrix",
    description: "A hub for projects, writing, and products.",
    url: "https://moosematrix.com",
    siteName: "The Moose Matrix",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
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

const THEME_INIT = `(() => {
  try {
    const m = document.cookie.match(/(?:^|;\\s*)mm-theme=([^;]+)/);
    const v = m ? decodeURIComponent(m[1]) : "system";
    const r = document.documentElement;
    if (v === "light" || v === "dark") r.dataset.theme = v;
    else r.removeAttribute("data-theme");
  } catch {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="mm-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT }}
        />
      </head>
      <body className="min-h-svh antialiased flex flex-col overflow-x-hidden">
        <NavbarStatic />
        {/* Desktop/tablet: allow nested scroll containers. Mobile: allow doc growth. */}
        <main className="flex-1 md:min-h-0">{children}</main>
        <FooterStatic />
      </body>
    </html>
  );
}
