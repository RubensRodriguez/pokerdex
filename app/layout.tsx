import { ClerkProvider } from "@clerk/nextjs";
import { Geist, JetBrains_Mono } from "next/font/google";

import type { Metadata } from "next";

import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "POKERDEX",
  description: "Private poker bankroll tracker.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="it" className={cn("dark", jetbrainsMono.variable, "font-sans", geist.variable)}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
