import type { Metadata, Viewport } from "next";
import { Anton, Dela_Gothic_One, Zen_Kaku_Gothic_New } from "next/font/google";
import CookieBanner from "@/components/CookieBanner";
import Footer from "@/components/Footer";
import PwaRegister from "@/components/PwaRegister";
import ModoSfondo from "@/components/ModoSfondo";
import SiteNav from "@/components/SiteNav";
import it from "@/i18n/it.json";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

// Tre voci: testo (gotico giapponese, chiaro anche piccolo), titoli (stretto e alto, da testata di rivista),
// numeri e onomatopee (grasso e rotondo). I font li serve Next dal nostro dominio.
const body = Zen_Kaku_Gothic_New({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});
const display = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});
const numeri = Dela_Gothic_One({
  variable: "--font-num",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const SITO = process.env.NEXT_PUBLIC_SITE_URL ?? "https://progetto-anime.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITO),
  title: { default: `${APP_NAME} · ${it.meta.motto}`, template: `%s · ${APP_NAME}` },
  applicationName: APP_NAME,
  description: it.meta.descrizione,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: APP_NAME,
    title: `${APP_NAME} · ${it.meta.motto}`,
    description: it.meta.descrizione,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} · ${it.meta.motto}`,
    description: it.meta.descrizione,
  },
};

export const viewport: Viewport = { themeColor: "#0e0d10" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body
        className={`${body.variable} ${display.variable} ${numeri.variable} antialiased pb-16 sm:pb-0`}
      >
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
