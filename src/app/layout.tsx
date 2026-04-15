import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Toolkit — CV Builder & Guidance",
  description: "Landing, guidance, and live CV builder with instant PDF export",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
