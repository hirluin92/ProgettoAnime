import type { CartaView } from "./duello";

// Tipi dell'API dei pacchetti (specchio di backend/app/pacchetti.py).
export interface TipoPacchetto {
  id: string;
  nome: string;
  prezzo: number;
  carte: number;
  garantita: string | null;
  probabilita: Record<string, number>;
  carte_per_rarita: Record<string, number>;
}
export interface NegozioOut {
  tipi: TipoPacchetto[];
  pity_max: number;
  rimborso: Record<string, number>;
}
export interface CartaEstratta {
  carta: CartaView;
  rarita: string;
  nuova: boolean;
  rimborso: number;
}
export interface AperturaOut {
  tipo: string;
  carte: CartaEstratta[];
  spesi: number;
  rimborsati: number;
  crediti: number;
  pity: number;
  garanzia_pity: boolean;
}
