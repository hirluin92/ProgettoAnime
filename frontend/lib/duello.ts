import type { Premio } from "./profile";
import type { RankedEsito } from "./ranked";
import type { ScalaEsito } from "./scalaDuelli";

// Tipi dell'API del Duello (specchio di backend/app/duello_api.py).
export interface CartaView {
  id: string;
  nome: string;
  anime: string;
  arch: string;
  potenza: number;
  costo: number;
  mossa: string;
  passiva: string;
  testo_mossa: string;
  testo_passiva: string;
  forma: string | null;
  rating: number;
  immagine_url: string | null;
}
export interface LuogoView {
  id: string;
  nome: string;
  regola: string;
  favorisce: string[];
}
export interface IstanzaView {
  uid: number;
  carta: CartaView;
  lato: number;
  corsia: number;
  potenza: number;
  mod: number;
}
export interface StatoView {
  turno: number;
  turni: number;
  energia: number;
  energia_cpu: number;
  mano: CartaView[];
  mano_cpu: number;
  mazzo: number;
  mazzo_cpu: number;
  luoghi: LuogoView[];
  corsie: IstanzaView[][][]; // [corsia][lato]
  totali: number[][];
  corsie_vinte: number[];
  finita: boolean;
  vincitore: number | null;
}
export interface DraftDuello {
  seed: number;
  mazzo: number;
  rilanci: number;
  mani: CartaView[][];
}
export interface DuelloState {
  id: string;
  livello: string;
  stato: StatoView;
}
export interface MossaIn {
  carta: string;
  corsia: number;
}
export interface EventoDuello {
  t: "turno" | "rivela" | "effetto" | "luogo" | "punteggi" | "fine";
  lato?: number;
  corsia?: number;
  carta?: string;
  carta_view?: CartaView;
  primo?: number;
}
export interface TurnoOut {
  id: string;
  eventi: EventoDuello[];
  stato: StatoView;
  mosse_cpu: MossaIn[];
  finita: boolean;
  vinto: boolean | null;
  premio: Premio | null;
  ranked?: RankedEsito | null;
  scala?: ScalaEsito | null;
}
export interface PickDuello {
  id: string;
  hand: number;
}

export const LIVELLI = ["facile", "normale", "difficile"] as const;

/** Costo reale di una carta in una corsia (la Gravità lo aumenta di 1). */
export function costoIn(c: CartaView, l: LuogoView): number {
  return c.costo + (l.id === "gravita" ? 1 : 0);
}

/** Posti massimi per lato in una corsia (il Ghiaccio ne concede 3). */
export function postiMax(l: LuogoView): number {
  return l.id === "ghiaccio" ? 3 : 4;
}

export const TUTORIAL_KEY = "arena.duello.regole";

export interface GiornoRiga {
  nome: string;
  stelle: number;
  punteggio: number;
}
export interface GiornoInfo {
  day: string;
  mazzo: CartaView[];
  mazzo_cpu: CartaView[];
  classifica: GiornoRiga[];
}
export interface GiornoEsito {
  stelle: number;
  punteggio: number;
  posizione: number;
  classifica: GiornoRiga[];
}

/** Energia totale disponibile in una partita: 1+2+…+6. */
export const ENERGIA_TOTALE = 21;
