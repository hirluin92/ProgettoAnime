import type { Metadata } from "next";
import { Big_Shoulders, Plus_Jakarta_Sans } from "next/font/google";
import CookieBanner from "@/components/CookieBanner";
import Footer from "@/components/Footer";
import SiteNav from "@/components/SiteNav";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"] });
const display = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Compra all'asta i personaggi anime con gli amici e vinci il torneo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className={`${body.variable} ${display.variable} antialiased`}>
        <div className="aurora" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <SiteNav />
        {children}
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
