import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { getEnvSnapshot } from "@/lib/env";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "split-it",
  description: "Editorial split-expense shell bootstrapped for Phase 0.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const env = getEnvSnapshot();

  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="bg-surface text-on-surface antialiased">
        <AppProviders
          clerkPublishableKey={env.clerkPublishableKey}
          convexUrl={env.convexUrl}
          mode={env.placeholderMode}
          isClerkConfigured={env.isClerkConfigured}
          isConvexConfigured={env.isConvexConfigured}
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
