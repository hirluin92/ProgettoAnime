// Tipi dell'API dei giochi a quiz (specchio di backend/app/quiz_api.py).
export interface VoceAnime {
  id: number;
  nome: string;
  alt: string;
  k: string;
  anno: number;
}
export interface SoluzioneAnime {
  id: number;
  titolo: string;
  titolo_en: string;
  anno: number;
  cover: string;
}
export type Esito = "uguale" | "parziale" | "diverso" | "piu" | "meno";
export interface IndizioNumero {
  valore: number;
  esito: "uguale" | "piu" | "meno";
  vicino: boolean;
}
export interface IndizioInsieme {
  valori: string[];
  esito: "uguale" | "parziale" | "diverso";
  giusti: string[];
}
export interface IndizioTesto {
  valore: string;
  esito: "uguale" | "diverso";
}
export interface FeedbackAnimedle {
  anno: IndizioNumero;
  episodi: IndizioNumero;
  voto: IndizioNumero;
  studio: IndizioInsieme;
  generi: IndizioInsieme;
  formato: IndizioTesto;
  fonte: IndizioTesto;
  stagione: IndizioTesto;
}
export interface AnimedleStato {
  giorno: string;
  tentativi_max: number;
  tentativi_fatti: number;
  finito: boolean;
  vinto: boolean;
  serie: number;
  crediti: number;
  bersaglio: SoluzioneAnime | null;
}
export interface AnimedleEsito {
  feedback: FeedbackAnimedle;
  giusto: boolean;
  tentativo: number;
  finito: boolean;
  crediti: number;
  bersaglio: SoluzioneAnime | null;
}

/** Minuscolo, senza accenti né punteggiatura: come fa il server per confrontare i titoli. */
export const normalizza = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

let cacheElenco: Promise<VoceAnime[]> | null = null;
export function caricaElenco(api: <T>(p: string) => Promise<T>): Promise<VoceAnime[]> {
  cacheElenco ??= api<VoceAnime[]>("/api/quiz/anime/elenco");
  return cacheElenco;
}

/** Quadratini per condividere il risultato senza svelare nulla. */
export function quadratini(f: FeedbackAnimedle): string {
  const v = [f.anno, f.episodi, f.voto, f.studio, f.generi, f.formato, f.fonte, f.stagione];
  return v
    .map((x) =>
      x.esito === "uguale"
        ? "🟩"
        : x.esito === "parziale" || ("vicino" in x && x.vicino)
          ? "🟨"
          : "⬛",
    )
    .join("");
}

export const FORMATI: Record<string, string> = { TV: "TV", MOVIE: "Film" };
export const FONTI: Record<string, string> = {
  MANGA: "Manga",
  LIGHT_NOVEL: "Light novel",
  ORIGINAL: "Originale",
  VISUAL_NOVEL: "Visual novel",
  VIDEO_GAME: "Videogioco",
  OTHER: "Altro",
  NOVEL: "Romanzo",
  WEB_NOVEL: "Web novel",
  ANIME: "Anime",
};
export const STAGIONI: Record<string, string> = {
  WINTER: "Inverno",
  SPRING: "Primavera",
  SUMMER: "Estate",
  FALL: "Autunno",
};

export type GiocoZoom = "scorcio" | "personaggio";
export interface IndizioZoom {
  k: string;
  v: string;
}
export interface SoluzioneZoom {
  id: number;
  nome: string;
  dettaglio: string;
  immagine: string;
}
export interface ZoomStato {
  giorno: string;
  tentativi_max: number;
  tentativi_fatti: number;
  finito: boolean;
  vinto: boolean;
  serie: number;
  crediti: number;
  immagine: string;
  fx: number;
  fy: number;
  indizi: IndizioZoom[];
  bersaglio: SoluzioneZoom | null;
}
export interface ZoomEsito {
  giusto: boolean;
  tentativo: number;
  finito: boolean;
  crediti: number;
  indizi: IndizioZoom[];
  bersaglio: SoluzioneZoom | null;
}
export interface ZoomNuovo {
  token: string;
  tentativi_max: number;
  immagine: string;
  fx: number;
  fy: number;
}

let cachePersonaggi: Promise<VoceAnime[]> | null = null;
export function caricaPersonaggi(api: <T>(p: string) => Promise<T>): Promise<VoceAnime[]> {
  cachePersonaggi ??= api<VoceAnime[]>("/api/quiz/personaggi/elenco");
  return cachePersonaggi;
}
