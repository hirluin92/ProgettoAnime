"use client";

import { useState } from "react";
import it from "@/i18n/it.json";
import { APP_NAME } from "@/lib/constants";
import { traccia } from "@/lib/eventi";

/** Condivide il replay di uno scontro: foglio di condivisione se c'è, altrimenti copia il link. */
export default function ShareButton({ matchId, vinto }: { matchId: string; vinto: boolean }) {
  const [copiato, setCopiato] = useState(false);
  const condividi = async () => {
    traccia("condividi", { cosa: "replay" });
    const url = `${window.location.origin}/partita/${matchId}`;
    const text = it.battle.testoCondivisione
      .replace("{esito}", vinto ? "vinto" : "perso")
      .replace("{app}", APP_NAME);
    if (navigator.share) {
      try {
        await navigator.share({ title: APP_NAME, text, url });
        return;
      } catch {
        /* annullato: si ripiega sulla copia */
      }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2500);
  };
  return (
    <button className="btn" onClick={() => void condividi()} data-testid="condividi">
      {copiato ? it.battle.copiato : it.battle.condividi}
    </button>
  );
}
