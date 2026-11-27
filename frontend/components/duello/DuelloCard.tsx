"use client";

import { SHOW_IMAGES } from "@/lib/api";
import { paletteFor } from "@/lib/animePalette";
import { rarity } from "@/components/battle/CharacterCard";
import { ARCH_NOMI } from "@/lib/battle/labels";
import type { CartaView } from "@/lib/duello";
import it from "@/i18n/it.json";

const pulisci = (t: string) => t.replace(/^(Al rivelarsi|Continuo):\s*/i, "");

interface Props {
  carta: CartaView;
  potenza?: number; // potenza attuale in campo (con gli effetti)
  compact?: boolean;
  selected?: boolean;
  dim?: boolean;
  onClick?: () => void;
  testId?: string;
}

export default function DuelloCard({
  carta,
  potenza,
  compact,
  selected,
  dim,
  onClick,
  testId,
}: Props) {
  const pal = paletteFor(carta.anime);
  const r = rarity(carta.rating);
  const p = potenza ?? carta.potenza;
  const delta = p - carta.potenza;
  const body = (
    <div
      className="flex h-full flex-col overflow-hidden rounded-[13px] bg-[#0c0920]"
      style={{ aspectRatio: compact ? undefined : "5 / 7.4" }}
    >
      <div
        className="relative min-h-[80px] flex-1"
        style={{ background: `linear-gradient(150deg, ${pal.from}, ${pal.to})` }}
      >
        {SHOW_IMAGES && carta.immagine_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={carta.immagine_url}
            alt=""
            referrerPolicy="no-referrer"
            className="absolute inset-0 size-full object-cover object-top"
          />
        ) : (
          <span className="display absolute inset-0 grid place-items-center text-6xl font-black text-white/70">
            {carta.nome.charAt(0)}
          </span>
        )}
        <span
          className="absolute left-1.5 top-1.5 grid size-9 place-items-center rounded-full border-2 border-white/80 bg-sky-500 text-lg font-black text-white shadow-lg"
          title={it.duello.costo}
        >
          {carta.costo}
        </span>
        <span
          className={`absolute right-1.5 top-1.5 grid size-10 place-items-center rounded-xl border-2 border-white/80 text-2xl font-black text-white shadow-lg ${
            delta > 0 ? "bg-emerald-600" : delta < 0 ? "bg-red-600" : "bg-black/80"
          }`}
          title={it.duello.potenza}
        >
          {p}
        </span>
        <span className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0c0920] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-1">
          <div className="display text-xl font-black leading-none drop-shadow">{carta.nome}</div>
          <div className="text-xs font-semibold text-white/70">
            {ARCH_NOMI[carta.arch]} · {r.name}
          </div>
        </div>
      </div>
      <div className="space-y-1.5 px-2.5 py-2">
        <p className="text-[0.8rem] leading-snug">
          <b className="text-amber-300">{it.duello.alRivelarsi}:</b> {pulisci(carta.testo_mossa)}
        </p>
        <p className="text-[0.8rem] leading-snug">
          <b className="text-sky-300">{it.duello.continuo}:</b> {pulisci(carta.testo_passiva)}
        </p>
      </div>
    </div>
  );
  const cls = `block w-full rounded-2xl p-[3px] text-left transition ${
    selected ? "-translate-y-2 ring-2 ring-white" : ""
  } ${dim ? "opacity-45" : ""} ${onClick ? "cursor-pointer hover:-translate-y-1" : ""}`;
  const style = { background: r.frame, boxShadow: `0 8px 26px -8px ${r.glow}` };
  return onClick ? (
    <button type="button" onClick={onClick} className={cls} style={style} data-testid={testId}>
      {body}
    </button>
  ) : (
    <div className={cls} style={style} data-testid={testId}>
      {body}
    </div>
  );
}

/** Miniatura in corsia: arte quadrata, potenza ben visibile, nome leggibile. Tocca per il dettaglio. */
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
  const pal = paletteFor(carta.anime);
  const delta = potenza - carta.potenza;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block overflow-hidden rounded-xl border bg-black/40 text-left ${
        tinta === "cpu" ? "border-red-400/40" : "border-emerald-400/40"
      }`}
      data-testid="duello-tile"
    >
      <div
        className="relative aspect-square"
        style={{ background: `linear-gradient(150deg, ${pal.from}, ${pal.to})` }}
      >
        {SHOW_IMAGES && carta.immagine_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={carta.immagine_url}
            alt=""
            referrerPolicy="no-referrer"
            className="absolute inset-0 size-full object-cover object-top"
          />
        ) : (
          <span className="display absolute inset-0 grid place-items-center text-3xl font-black text-white/70">
            {carta.nome.charAt(0)}
          </span>
        )}
        <span
          className={`absolute bottom-1 right-1 grid min-w-8 place-items-center rounded-lg px-1.5 py-0.5 text-lg font-black leading-none text-white shadow-lg ${
            delta > 0 ? "bg-emerald-600" : delta < 0 ? "bg-red-600" : "bg-black/80"
          }`}
        >
          {potenza}
        </span>
      </div>
      <div className="truncate px-1.5 py-1 text-xs font-bold">{carta.nome.split(" ")[0]}</div>
    </button>
  );
}
