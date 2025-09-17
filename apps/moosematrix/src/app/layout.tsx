import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata = {
  title: "The Moose Matrix",
  description: "Research, security, and writing by Dustin Warren",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable}`}
    >
      {/* Default body font = Inter (sans), override with font-mono for headings/code */}
      <body className="bg-black text-white font-sans">
        {children}
      </body>
    </html>
  );
}

