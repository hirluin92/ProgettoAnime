"use client";

import Icon from "@/components/Icon";
import { rarity } from "@/components/battle/CharacterCard";
import { SHOW_IMAGES } from "@/lib/api";
import { paletteFor } from "@/lib/animePalette";
import type { AlbumCarta } from "@/lib/album";

// Una tasca del raccoglitore: carta posseduta (cornice per rarità) o sagoma sfocata numerata.
// Le misure sono in cqw: seguono la larghezza della pagina in cui si trova.

export default function AlbumSlot({
  c,
  n,
  inMazzo,
  onClick,
  onDettaglio,
}: {
  c: AlbumCarta;
  n: number;
  inMazzo: boolean;
  onClick: () => void;
  onDettaglio: () => void;
}) {
  const pal = paletteFor(c.carta.anime);
  const r = rarity(c.carta.rating);
  const immagine = SHOW_IMAGES && c.carta.immagine_url;

  if (!c.posseduta) {
    return (
      <li data-testid="album-mancante" className="min-w-0">
        <button
          type="button"
          onClick={onDettaglio}
          aria-label={`#${n}`}
          className="relative block aspect-[5/7] w-full overflow-hidden rounded-[1.8cqw] border-2 border-dashed border-white/15 bg-black/30 transition hover:border-white/35"
        >
          {immagine ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.carta.immagine_url ?? ""}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              className="absolute inset-0 size-full scale-110 object-cover object-top opacity-60"
              style={{ filter: "blur(7px) brightness(0.22) grayscale(1)" }}
            />
          ) : (
            <span
              className="absolute inset-0"
              style={{ background: `linear-gradient(150deg, ${pal.from}33, ${pal.to}22)` }}
            />
          )}
          <span className="display absolute inset-0 grid place-items-center text-[7.5cqw] font-black text-white/35">
            {n}
          </span>
          <span className="absolute inset-x-0 bottom-[1.2cqw] text-center text-[1.9cqw] font-bold tracking-[0.3em] text-white/25">
            ???
          </span>
        </button>
      </li>
    );
  }

  return (
    <li data-testid="album-posseduta" className="group relative min-w-0 hover:z-10">
      <button
        type="button"
        onClick={onClick}
        aria-label={c.carta.nome}
        className={`relative block aspect-[5/7] w-full rounded-[1.8cqw] p-[0.55cqw] text-left transition duration-200 group-hover:-translate-y-[0.8cqw] group-hover:scale-[1.04] ${
          inMazzo ? "ring-[0.5cqw] ring-emerald-400" : ""
        }`}
        style={{ background: r.frame, boxShadow: `0 1.2cqw 3cqw -1cqw ${r.glow}` }}
      >
        <span className="relative block size-full overflow-hidden rounded-[1.4cqw] bg-[#0c0920]">
          <span
            className="absolute inset-0"
            style={{ background: `linear-gradient(150deg, ${pal.from}, ${pal.to})` }}
          />
          {immagine ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.carta.immagine_url ?? ""}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              className="absolute inset-0 size-full object-cover object-top"
            />
          ) : (
            <span className="display absolute inset-0 grid place-items-center text-[9cqw] font-black text-white/70">
              {c.carta.nome.charAt(0)}
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/90 to-transparent" />
          <span className="absolute left-[1cqw] top-[1cqw] grid size-[4.6cqw] place-items-center rounded-full border border-white/80 bg-sky-500 text-[2.6cqw] font-black text-white shadow">
            {c.carta.costo}
          </span>
          <span className="absolute right-[1cqw] top-[1cqw] grid min-w-[4.8cqw] place-items-center rounded-[1cqw] border border-white/80 bg-black/75 px-[0.6cqw] text-[2.8cqw] font-black leading-[1.35] text-white shadow">
            {c.carta.potenza}
          </span>
          <span className="absolute inset-x-0 bottom-0 px-[1.2cqw] pb-[1cqw]">
            <span className="display block truncate text-[3.2cqw] font-black leading-none text-white drop-shadow">
              {c.carta.nome}
            </span>
            <span className="block truncate text-[1.9cqw] font-semibold text-white/70">
              {r.name}
            </span>
          </span>
          {inMazzo && (
            <span className="absolute left-1/2 top-[1cqw] grid size-[5cqw] -translate-x-1/2 place-items-center rounded-full bg-emerald-400 text-black shadow">
              <Icon name="check" className="size-[3.4cqw]" />
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={onDettaglio}
        aria-label={`${c.carta.nome}: dettagli`}
        className="absolute bottom-[1.4cqw] right-[1.4cqw] grid size-[4.2cqw] place-items-center rounded-full border border-white/50 bg-black/70 text-[2.4cqw] font-black italic text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
      >
        i
      </button>
    </li>
  );
}
