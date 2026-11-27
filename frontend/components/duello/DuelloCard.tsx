"use client";

import Carta, { raritaDi } from "@/components/carta/Carta";
import { ARCH_NOMI } from "@/lib/battle/labels";
import type { CartaView } from "@/lib/duello";
import it from "@/i18n/it.json";

const pulisci = (t: string) => t.replace(/^(Al rivelarsi|Continuo):\s*/i, "");
const NOMI_RARITA = it.album.rarita as Record<string, string>;

interface Props {
  carta: CartaView;
  potenza?: number; // potenza attuale in campo (con gli effetti)
  compact?: boolean;
  mano?: boolean; // carta in mano: più bassa, senza testi (gli effetti si leggono alla selezione)
  selected?: boolean;
  dim?: boolean;
  onClick?: () => void;
  testId?: string;
}

/** La carta del Duello: è la carta unica del sito (components/carta/Carta) con costo, potenza ed effetti. */
export default function DuelloCard({
  carta,
  potenza,
  mano,
  selected,
  dim,
  onClick,
  testId,
}: Props) {
  return (
    <Carta
      nome={carta.nome}
      anime={carta.anime}
      rating={carta.rating}
      immagine={carta.immagine_url}
      costo={carta.costo}
      potenza={potenza ?? carta.potenza}
      base={carta.potenza}
      forma={mano ? null : carta.forma}
      sotto={`${ARCH_NOMI[carta.arch] ?? carta.arch} · ${NOMI_RARITA[raritaDi(carta.rating)]}`}
      misura={mano ? "mano" : "piena"}
      scelta={selected}
      className={dim ? "opacity-45" : ""}
      onClick={onClick}
      testId={testId}
      ariaLabel={onClick ? `${carta.nome}, ${it.duello.costo} ${carta.costo}` : undefined}
      testi={
        mano ? undefined : (
          <>
            <span className="t-rivela block">
              <b>{it.duello.alRivelarsi}</b> {pulisci(carta.testo_mossa)}
            </span>
            <span className="t-continuo block">
              <b>{it.duello.continuo}</b> {pulisci(carta.testo_passiva)}
            </span>
          </>
        )
      }
    />
  );
}

/** Miniatura in corsia: la stessa carta in misura «mini». Tocca per il dettaglio. */
export function DuelloTile({
  carta,
  potenza,
  onClick,
  tinta,
}: {
  carta: CartaView;
  potenza: number;
  onClick?: () => void;
  tinta?: "tu" | "cpu";
}) {
  return (
    <Carta
      nome={carta.nome}
      anime={carta.anime}
      rating={carta.rating}
      immagine={carta.immagine_url}
      potenza={potenza}
      base={carta.potenza}
      misura="mini"
      fermo
      onClick={onClick ?? (() => undefined)}
      ariaLabel={`${carta.nome}, ${it.duello.potenza} ${potenza}`}
      testId="duello-tile"
      className={tinta === "cpu" ? "tile-cpu" : "tile-tu"}
    />
  );
}
