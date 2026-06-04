import type { Metadata } from "next";
import { BotWidget } from "@/components/bot-widget";
import "./globals.css";

export const metadata: Metadata = {
  title: "CBC Swift — School OS",
  description: "AI-powered school management for CBC Kenya. Multi-tenant, M-Pesa integrated, role-based dashboards.",
  keywords: "CBC, Kenya, school management, M-Pesa, education, AI analytics",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <BotWidget />
      </body>
    </html>
  );
}
