import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Navbar, Footer } from "@moosematrix/ui";



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
  twitter: { card: "summary_large_image", title: "The Moose Matrix", description: "A hub for projects, writing, and products.", images: ["/og.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Navbar />
          {children}
        <Footer />
       {/* Plausible analytics (optional; safe to leave) */}
        <Script defer data-domain="moosematrix.com" src="https://plausible.io/js/script.js" />
      </body>
    </html>
  );
}
