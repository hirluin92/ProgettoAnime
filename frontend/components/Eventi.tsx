"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useConsent } from "@/components/CookieBanner";
import { invia, traccia } from "@/lib/eventi";

const APERTO = "evt-aperto";

/**
 * Invia l'evento «apertura» una volta per sessione (solo con il consenso ai cookie) e svuota la
 * coda quando la pagina si nasconde o si chiude. Non disegna nulla.
 */
export default function Eventi() {
  const consent = useConsent();
  const path = usePathname();

  useEffect(() => {
    if (consent !== "accepted") return;
    try {
      if (window.sessionStorage.getItem(APERTO)) return;
      window.sessionStorage.setItem(APERTO, "1");
    } catch {
      return;
    }
    traccia("apertura", { path: path.slice(0, 40) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- conta solo il primo ingresso della sessione
  }, [consent]);

  useEffect(() => {
    const svuota = () => {
      if (document.visibilityState === "hidden") invia();
    };
    document.addEventListener("visibilitychange", svuota);
    window.addEventListener("pagehide", invia);
    return () => {
      document.removeEventListener("visibilitychange", svuota);
      window.removeEventListener("pagehide", invia);
    };
  }, []);

  return null;
}
