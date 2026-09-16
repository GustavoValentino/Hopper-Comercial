import type { Metadata, Viewport } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import DashboardWrapper from "./dashboardWrapper";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import InstallPrompt from "./(components)/InstallPrompt";
import AppleSplashScreens from "./(components)/AppleSplashScreens";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hopper",
  description: "Gerenciamento Inteligente de Inventário e Validades",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hopper",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body className={inter.className}>
        <AppleSplashScreens />
        <DashboardWrapper>{children}</DashboardWrapper>
        <InstallPrompt />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
