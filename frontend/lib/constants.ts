// Il nome del gioco sta SOLO qui: tutto il sito (titoli, marchio, bustine, condivisione, manifest) lo legge da questa riga.
// Inkiri = ink + kiri («taglio» in giapponese): il taglio d'inchiostro dello stemma. Storia del nome in STATO.md.
export const APP_NAME = "Inkiri";

// Indirizzo per le richieste di rimozione (da impostare in produzione con NEXT_PUBLIC_CONTACT_EMAIL).
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "rimozioni@example.com";

// Community del gioco nuovo (Discord ed email). Vuoti = l'invito non compare: finché sono segnaposto
// non si mostra, per non mandare i giocatori a un indirizzo che non esiste.
export const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "";
export const COMMUNITY_EMAIL = process.env.NEXT_PUBLIC_COMMUNITY_EMAIL ?? "";
