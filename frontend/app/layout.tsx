import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Plus_Jakarta_Sans } from "next/font/google";
import CookieBanner from "@/components/CookieBanner";
import Footer from "@/components/Footer";
import PwaRegister from "@/components/PwaRegister";
import ModoSfondo from "@/components/ModoSfondo";
import SiteNav from "@/components/SiteNav";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"] });
const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  description: "Compra all'asta i personaggi anime con gli amici e vinci il torneo.",
};

export const viewport: Viewport = { themeColor: "#05040c" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className={`${body.variable} ${display.variable} antialiased pb-16 sm:pb-0`}>
        <div className="aurora" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <ModoSfondo />
        <SiteNav />
        {children}
        <Footer />
        <CookieBanner />
        <PwaRegister />
      </body>
    </html>
  );
}
