import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Emberlend — Micro-lending on Hedera",
  description:
    "Emberlend is a micro-lending dApp on Hedera. Small sparks, real growth — collateralized loans for farmers and entrepreneurs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
