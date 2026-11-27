import type { Metadata } from "next";
import it from "@/i18n/it.json";
import { APP_NAME } from "@/lib/constants";

// Indirizzo pubblico del sito: da NEXT_PUBLIC_SITE_URL (da impostare quando ci sarà un dominio proprio).
export const SITO = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://progetto-anime.vercel.app"
).replace(/\/$/, "");

export const conNome = (s: string) => s.replace(/\{app\}/g, APP_NAME);

type Voce = { titolo: string; descrizione: string; h1?: string; og?: string };
const VOCI = it.seo as unknown as Record<string, Voce>;
export type ChiaveSeo = Exclude<keyof typeof it.seo, "guidaOcchiello" | "briciole">;

/** Pagine pubbliche, con il loro indirizzo: servono a sitemap, metadati e briciole. */
export const PAGINE: { chiave: ChiaveSeo; path: string; priorita: number; quotidiana?: boolean }[] =
  [
    { chiave: "home", path: "/", priorita: 1 },
    { chiave: "duello", path: "/duello", priorita: 0.9 },
    { chiave: "sfide", path: "/sfide", priorita: 0.9, quotidiana: true },
    { chiave: "animedle", path: "/sfide/animedle", priorita: 0.8, quotidiana: true },
    { chiave: "sigla", path: "/sfide/sigla", priorita: 0.8, quotidiana: true },
    { chiave: "scorcio", path: "/sfide/scorcio", priorita: 0.7, quotidiana: true },
    { chiave: "personaggio", path: "/sfide/personaggio", priorita: 0.7, quotidiana: true },
    { chiave: "giorno", path: "/duello/giorno", priorita: 0.7, quotidiana: true },
    { chiave: "comeSiGioca", path: "/come-si-gioca", priorita: 0.8 },
    { chiave: "ranked", path: "/ranked", priorita: 0.6 },
    { chiave: "scala", path: "/scala", priorita: 0.6 },
    { chiave: "veloce", path: "/veloce", priorita: 0.5 },
    { chiave: "negozio", path: "/negozio", priorita: 0.6 },
    { chiave: "album", path: "/album", priorita: 0.6 },
    { chiave: "info", path: "/info", priorita: 0.4 },
  ];

/** Metadati di una pagina: titolo, descrizione, indirizzo canonico, Open Graph con la sua immagine. */
export function meta(
  chiave: ChiaveSeo,
  path: string,
  opzioni: { noindex?: boolean } = {},
): Metadata {
  const v = VOCI[chiave];
  const titolo = conNome(v.titolo);
  const descrizione = conNome(v.descrizione);
  const assoluto = chiave === "home";
  const completo = assoluto ? titolo : `${titolo} · ${APP_NAME}`;
  const immagine = v.og ? `/og/${chiave}` : "/og/home";
  return {
    title: assoluto ? { absolute: titolo } : titolo,
    description: descrizione,
    alternates: opzioni.noindex ? undefined : { canonical: path },
    robots: opzioni.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      locale: "it_IT",
      siteName: APP_NAME,
      url: path,
      title: completo,
      description: descrizione,
      images: [{ url: immagine, width: 1200, height: 630, alt: completo }],
    },
    twitter: {
      card: "summary_large_image",
      title: completo,
      description: descrizione,
      images: [immagine],
    },
  };
}

export const h1Di = (chiave: ChiaveSeo) => conNome(VOCI[chiave].h1 ?? VOCI[chiave].titolo);
