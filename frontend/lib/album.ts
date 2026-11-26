import type { CartaView } from "./duello";

// Tipi dell'API dell'album (specchio di backend/app/album.py).
export type Rarita = "comune" | "rara" | "epica" | "leggendaria";
export interface AlbumCarta {
  carta: CartaView;
  rarita: Rarita;
  posseduta: boolean;
}
export interface MazzoPersonale {
  nome: string;
  carte: string[];
}
export interface AlbumOut {
  carte: AlbumCarta[];
  posseduti: number;
  totale: number;
  mazzi: MazzoPersonale[];
  limiti: {
    mazzo: number;
    mazzi: number;
    leggendarie: number;
    epiche_o_meglio: number;
    costo: number;
  };
}

/** Quanto pesa un mazzo rispetto ai tetti (per mostrarlo mentre lo si compone). */
export function riepilogoMazzo(carte: AlbumCarta[], ids: string[]) {
  const per = new Map(carte.map((c) => [c.carta.id, c]));
  const scelte = ids.map((i) => per.get(i)).filter((c): c is AlbumCarta => !!c);
  return {
    costo: scelte.reduce((t, c) => t + c.carta.costo, 0),
    leggendarie: scelte.filter((c) => c.rarita === "leggendaria").length,
    alte: scelte.filter((c) => c.rarita === "leggendaria" || c.rarita === "epica").length,
  };
}
