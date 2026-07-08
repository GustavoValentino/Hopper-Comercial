import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import DashboardWrapper from "./dashboardWrapper";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hopper",
  description: "Gerenciamento Inteligente de Inventário e Validades",
  icons: {
    icon: "/hopper_icon_tight.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body className={inter.className}>
        <DashboardWrapper>{children}</DashboardWrapper>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
