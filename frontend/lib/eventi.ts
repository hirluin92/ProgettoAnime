import { API_URL } from "./api";

/**
 * Eventi anonimi di utilizzo (ritenzione, rivincite). Partono SOLO se l'utente ha accettato il banner
 * dei cookie. L'identificatore è casuale, scollegato dal profilo; nessun testo libero.
 */
export type NomeEvento =
  "apertura" | "partita_inizio" | "partita_fine" | "rivincita" | "abbandono" | "condividi";
type Valore = string | number | boolean;
export type Props = Record<string, Valore>;
type Evento = { nome: NomeEvento; sessione: string; props: Props };

const CONSENSO = "cookie-consent";
const PID = "evt-pid";
const SESSIONE = "evt-sessione";
const MAX_BLOCCO = 20;
const MAX_PROPS = 8;
const MAX_CHIAVE = 20;
const MAX_TESTO = 40;

let coda: Evento[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/** Tiene solo ciò che il server accetta: poche proprietà, chiavi e testi corti. */
export function pulisci(props: Props): Props {
  const out: Props = {};
  for (const [k, v] of Object.entries(props).slice(0, MAX_PROPS)) {
    out[k.slice(0, MAX_CHIAVE)] = typeof v === "string" ? v.slice(0, MAX_TESTO) : v;
  }
  return out;
}

function nuovoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // ripiego per browser vecchi: formato UUID con numeri casuali (basta per un id statistico)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function leggiOCrea(storage: Storage, chiave: string): string {
  let v = storage.getItem(chiave);
  if (!v) {
    v = nuovoId();
    storage.setItem(chiave, v);
  }
  return v;
}

export function consensoDato(): boolean {
  try {
    return window.localStorage.getItem(CONSENSO) === "accepted";
  } catch {
    return false;
  }
}

/** Invia subito gli eventi in coda (anche mentre la pagina si chiude). Non solleva mai errori. */
export function invia(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (typeof window === "undefined" || coda.length === 0) return;
  try {
    const pid = leggiOCrea(window.localStorage, PID);
    while (coda.length > 0) {
      const eventi = coda.splice(0, MAX_BLOCCO);
      void fetch(`${API_URL}/api/eventi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid, eventi }),
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    coda = [];
  }
}

export function traccia(nome: NomeEvento, props: Props = {}): void {
  if (typeof window === "undefined" || !consensoDato()) return;
  try {
    coda.push({
      nome,
      sessione: leggiOCrea(window.sessionStorage, SESSIONE),
      props: pulisci(props),
    });
    if (coda.length >= MAX_BLOCCO) invia();
    else if (!timer) timer = setTimeout(invia, 2000);
  } catch {
    /* storage non disponibile: niente statistiche, il gioco continua */
  }
}
