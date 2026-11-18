import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tradefolio — Trading Journal",
  description: "A multi-strategy trading journal and analytics workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
