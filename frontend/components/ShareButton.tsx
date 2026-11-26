"use client";

import { useState } from "react";
import it from "@/i18n/it.json";

/** Condivide il replay di uno scontro: foglio di condivisione se c'è, altrimenti copia il link. */
export default function ShareButton({ matchId, vinto }: { matchId: string; vinto: boolean }) {
  const [copiato, setCopiato] = useState(false);
  const condividi = async () => {
    const url = `${window.location.origin}/partita/${matchId}`;
    const text = it.battle.testoCondivisione.replace("{esito}", vinto ? "vinto" : "perso");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Arena Anime", text, url });
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
