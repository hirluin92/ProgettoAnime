import Guida from "@/components/Guida";
import Home from "@/components/Home";
import JsonLd from "@/components/JsonLd";
import LinkSfide from "@/components/LinkSfide";
import it from "@/i18n/it.json";
import { APP_NAME } from "@/lib/constants";
import { conNome, meta, SITO } from "@/lib/seo";

export const metadata = meta("home", "/");

export default function HomePage() {
  return (
    <>
      <Home />
      <LinkSfide />
      <Guida chiave="home" />
      <JsonLd
        dati={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${SITO}/#sito`,
              url: SITO,
              name: APP_NAME,
              inLanguage: "it",
              description: conNome(it.seo.home.descrizione),
            },
            {
              "@type": ["VideoGame", "WebApplication"],
              "@id": `${SITO}/#gioco`,
              name: APP_NAME,
              url: SITO,
              inLanguage: "it",
              description: conNome(it.seo.home.descrizione),
              genre: ["Gioco di carte", "Strategia"],
              gamePlatform: "Browser web",
              applicationCategory: "GameApplication",
              operatingSystem: "Qualsiasi (browser)",
              playMode: ["SinglePlayer", "MultiPlayer"],
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
              image: `${SITO}/og/home`,
            },
          ],
        }}
      />
    </>
  );
}
