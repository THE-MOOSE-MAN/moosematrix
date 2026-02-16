import "./globals.css";
import Script from "next/script";
import { NavbarStatic, FooterStatic } from "@moosematrix/ui";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Early theme application (your untracked file) */}
        <Script src="/mm-theme.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen antialiased flex flex-col">
        <NavbarStatic />
        <main className="flex-1">{children}</main>
        <FooterStatic />
      </body>
    </html>
  );
}
