import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockSense | Enterprise Inventory Management System",
  description:
    "Transaction-safe, audit-backed real-time multi-warehouse inventory management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        {children}
      </body>
    </html>
  );
}
