import type { Metadata } from "next";
import "./globals.css";
import { NavbarStatic, FooterStatic } from "@moosematrix/ui";
import type { Viewport } from "next";


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

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-[var(--bg)] text-[var(--fg)]">
        <NavbarStatic />
        {children}
        <FooterStatic since={2020} />
      </body>
    </html>
  );
}
