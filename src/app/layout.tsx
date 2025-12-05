import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CloudFabric - Multi-Cloud Management Platform",
  description: "Upload to S3. Build workflows visually. Design architecture with AI. Monitor AWS metrics.",
  keywords: ["AWS", "GCP", "Azure", "cloud", "workflow", "architecture", "monitoring", "SaaS"],
  icons: {
    icon: "/branding/favicons/favicon.ico",
    apple: "/branding/favicons/apple-touch-icon.png",
  },
  manifest: "/branding/favicons/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
