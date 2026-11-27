"use client";

import Icon from "@/components/Icon";
import Carta from "@/components/carta/Carta";
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
          className="relative block aspect-[5/7] w-full overflow-hidden rounded-[1.6cqw] border-[0.45cqw] border-dashed border-black/45 bg-black/[0.07] transition-colors hover:border-black"
        >
          {immagine ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.carta.immagine_url ?? ""}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              className="absolute inset-0 size-full scale-110 object-cover object-top opacity-25"
              style={{ filter: "blur(5px) grayscale(1) contrast(1.4)" }}
            />
          ) : (
            <span
              className="absolute inset-0"
              style={{ background: `linear-gradient(150deg, ${pal.from}33, ${pal.to}22)` }}
            />
          )}
          <span className="num absolute inset-0 grid place-items-center text-[6.5cqw] text-black/55">
            {n}
          </span>
          <span className="absolute inset-x-0 bottom-[1.2cqw] text-center text-[1.9cqw] font-black tracking-[0.3em] text-black/45">
            ???
          </span>
        </button>
      </li>
    );
  }

  return (
    <li data-testid="album-posseduta" className="group relative min-w-0 hover:z-10">
      <Carta
        nome={c.carta.nome}
        anime={c.carta.anime}
        rating={c.carta.rating}
        immagine={c.carta.immagine_url}
        costo={c.carta.costo}
        potenza={c.carta.potenza}
        sotto={r.name}
        scelta={inMazzo}
        fermo
        onClick={onClick}
        ariaLabel={c.carta.nome}
      />
      {inMazzo && (
        <span className="pointer-events-none absolute left-1/2 top-[-1.2cqw] z-10 grid size-[5cqw] -translate-x-1/2 place-items-center rounded-full border-2 border-black bg-emerald-400 text-black">
          <Icon name="check" className="size-[3.4cqw]" />
        </span>
      )}
      <button
        type="button"
        onClick={onDettaglio}
        aria-label={`${c.carta.nome}: dettagli`}
        className="absolute right-[1cqw] top-[38%] z-10 grid size-[max(4.4cqw,1.75rem)] place-items-center rounded-full border-2 border-black bg-carta text-[max(2.4cqw,0.8rem)] font-black italic text-nero opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
      >
        i
      </button>
    </li>
  );
}
