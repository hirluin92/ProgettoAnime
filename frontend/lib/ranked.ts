// Tipi dell'API ranked (specchio di backend/app/ranked.py).
export interface AvversarioRanked {
  nome: string;
  mmr: number;
  lega: string;
  divisione: string | null;
  fantasma: boolean;
}
export interface SogliaSettimana {
  partite: number;
  crediti: number;
  raggiunta: boolean;
  ritirata: boolean;
}
export interface RigaRanked {
  nome: string;
  mmr: number;
  lega: string;
  divisione: string | null;
}
export interface RankedStato {
  mmr: number;
  lega: string;
  divisione: string | null;
  partite: number;
  in_piazzamento: boolean;
  piazzamento_rimaste: number;
  settimana: string;
  partite_settimana: number;
  soglie: SogliaSettimana[];
  classifica: RigaRanked[];
  serve_account: boolean;
}
export interface RankedStart {
  ranked_id: string;
  seed: number;
  avversario: AvversarioRanked;
}
export interface RankedEsito {
  mmr_prima: number;
  mmr_dopo: number;
  lega_prima: string;
  divisione_prima: string | null;
  lega_dopo: string;
  divisione_dopo: string | null;
  promosso: boolean;
  retrocesso: boolean;
  in_piazzamento: boolean;
  avversario: string;
}

export const nomeLega = (lega: string, div: string | null) => (div ? `${lega} ${div}` : lega);
export const COLORI_LEGA: Record<string, string> = {
  Bronzo: "#c9824a",
  Argento: "#cfd8e6",
  Oro: "#ffd21f",
  Platino: "#5fe0d0",
  Diamante: "#7ab8ff",
  Campione: "#ff5a45",
};
/** Punti MMR dall'inizio del gradino attuale (0-49) e gradino di 50 punti. */
export const progressoGradino = (mmr: number) => Math.max(0, Math.min(49, (mmr - 700) % 50));
