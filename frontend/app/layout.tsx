import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import CookieBanner from "@/components/CookieBanner";
import Footer from "@/components/Footer";
import PwaRegister from "@/components/PwaRegister";
import ModoSfondo from "@/components/ModoSfondo";
import SiteNav from "@/components/SiteNav";
import { APP_NAME } from "@/lib/constants";
import { meta, SITO } from "@/lib/seo";
import "./globals.css";
import "./profondita.css";

// Tre voci: testo (Zen Kaku Gothic New, chiaro anche piccolo), titoli (Anton, stretto e alto, da testata
// di rivista), numeri e onomatopee (Dela Gothic One, grasso e rotondo).
// I file sono in app/fonts: solo il sottoinsieme latino (5 file, ~55 kB in tutto). Caricati da
// next/font/google gli stessi caratteri portavano 607 regole @font-face (sono font giapponesi, divisi in
// centinaia di fette) e il precaricamento di ~380 file: 4,5 MB a pagina. Licenza OFL, vedi app/fonts/LEGGIMI.txt.
const body = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    { path: "./fonts/zen-kaku-gothic-new-400-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/zen-kaku-gothic-new-700-latin.woff2", weight: "700", style: "normal" },
    { path: "./fonts/zen-kaku-gothic-new-900-latin.woff2", weight: "900", style: "normal" },
  ],
});
const display = localFont({
  variable: "--font-display",
  display: "swap",
  src: "./fonts/anton-400-latin.woff2",
  weight: "400",
});
const numeri = localFont({
  variable: "--font-num",
  display: "swap",
  src: "./fonts/dela-gothic-one-400-latin.woff2",
  weight: "400",
  preload: false, // serve solo a numeri e onomatopee: non blocca il primo testo
});

export const metadata: Metadata = {
  ...meta("home", "/"),
  metadataBase: new URL(SITO),
  title: { default: meta("home", "/").openGraph?.title as string, template: `%s · ${APP_NAME}` },
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  alternates: undefined,
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
