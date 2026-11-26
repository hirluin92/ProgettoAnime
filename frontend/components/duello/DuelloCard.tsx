"use client";

import { SHOW_IMAGES } from "@/lib/api";
import { paletteFor } from "@/lib/animePalette";
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
  const p = potenza ?? carta.potenza;
  const delta = p - carta.potenza;
  const body = (
    <>
      <div
        className="relative overflow-hidden"
        style={{
          height: compact ? 44 : 120,
          background: `linear-gradient(150deg, ${pal.from}, ${pal.to})`,
        }}
      >
        {SHOW_IMAGES && carta.immagine_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={carta.immagine_url}
            alt=""
            loading="eager"
            referrerPolicy="no-referrer"
            className="absolute inset-0 size-full object-cover object-top"
          />
        ) : (
          <span className="display absolute inset-0 grid place-items-center text-4xl font-black text-white/70">
            {carta.nome.charAt(0)}
          </span>
        )}
        <span
          className="absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-sky-500 text-xs font-black text-white shadow"
          title={it.duello.costo}
        >
          {carta.costo}
        </span>
        <span
          className={`absolute right-1 top-1 grid min-w-6 place-items-center rounded-md px-1 text-sm font-black text-white shadow ${
            delta > 0 ? "bg-emerald-600" : delta < 0 ? "bg-red-600" : "bg-black/70"
          }`}
          title={it.duello.potenza}
        >
          {p}
        </span>
      </div>
      <div className="space-y-1 p-2 text-left">
        <div className="truncate text-sm font-extrabold leading-tight">{carta.nome}</div>
        {!compact && (
          <>
            <div className="text-xs leading-tight muted">{ARCH_NOMI[carta.arch]}</div>
            <p className="text-xs leading-snug">
              <b className="text-amber-300">{it.duello.alRivelarsi}:</b>{" "}
              {pulisci(carta.testo_mossa)}
            </p>
            <p className="text-xs leading-snug">
              <b className="text-sky-300">{it.duello.continuo}:</b> {pulisci(carta.testo_passiva)}
            </p>
          </>
        )}
      </div>
    </>
  );
  const cls = `panel block w-full overflow-hidden p-0 transition ${
    selected ? "ring-2 ring-amber-300 -translate-y-1" : ""
  } ${dim ? "opacity-40" : ""} ${onClick ? "cursor-pointer hover:-translate-y-0.5" : ""}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={cls} data-testid={testId}>
      {body}
    </button>
  ) : (
    <div className={cls} data-testid={testId}>
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
