import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NavbarStatic, FooterStatic } from "@moosematrix/ui";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const v = cookieStore.get("mm-theme")?.value; // <-- await fixed

  const dataTheme = v === "light" || v === "dark" ? v : undefined;

  return (
    <html
      lang="en"
      data-theme={dataTheme}
      className={`${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <NavbarStatic />
        <div id="content">{children}</div>
        <FooterStatic year={BUILD_YEAR} />
      </body>
    </html>
  );
}
