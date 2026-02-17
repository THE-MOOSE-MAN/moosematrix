// layout.tsx
import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-svh antialiased flex flex-col overflow-x-hidden">
        <NavbarStatic />
        {/* Keep the document as the primary scroll container (mobile-friendly). */}
        <main className="flex-1 min-h-0">{children}</main>
        <FooterStatic />
      </body>
    </html>
  );
}
