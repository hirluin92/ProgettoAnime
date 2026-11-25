// Spazio pubblicitario predisposto ma disattivato di default (NEXT_PUBLIC_ADS_ENABLED=true per attivarlo).
// Anche da attivo non carica nulla finché l'utente non ha dato il consenso ai cookie.
"use client";

import { useConsent } from "./CookieBanner";

export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";

export default function AdSlot({ slot }: { slot: string }) {
  const consent = useConsent();
  if (!ADS_ENABLED || consent !== "accepted") return null;
  return <div data-ad-slot={slot} data-testid="ad-slot" className="my-4 min-h-24 w-full" />;
}
