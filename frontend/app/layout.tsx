import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import CookieBanner from "@/components/CookieBanner";
import Footer from "@/components/Footer";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin"] });
const display = Oswald({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Compra all'asta i personaggi anime con gli amici e vinci il torneo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className={`${body.variable} ${display.variable} antialiased`}>
        {children}
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
