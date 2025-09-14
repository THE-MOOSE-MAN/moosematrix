import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Moose Matrix",
  description: "A hub for ideas, projects, and ventures.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
