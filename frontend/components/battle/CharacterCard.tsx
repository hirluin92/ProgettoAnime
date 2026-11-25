"use client";

import { motion } from "framer-motion";
import { SHOW_IMAGES } from "@/lib/api";
import { paletteFor } from "@/lib/animePalette";
import type { Character } from "@/lib/types/match";

interface Props {
  character: Pick<Character, "nome" | "anime" | "tags" | "rating"> & {
    immagine_url?: string | null;
  };
  role?: string;
  power?: number;
  side?: "A" | "B";
  idle?: boolean;
  lungeKey?: number;
  hitKey?: number;
  compact?: boolean;
}

const SHAPES: Record<string, string> = {
  Capitano: "M50 8 L62 34 L92 36 L68 56 L76 88 L50 70 L24 88 L32 56 L8 36 L38 34Z",
  Tank: "M50 8 L88 22 L84 62 Q50 96 16 62 L12 22Z",
  Guaritore: "M40 10 H60 V40 H90 V60 H60 V90 H40 V60 H10 V40 H40Z",
};
const DEFAULT_SHAPE = "M50 6 L92 50 L50 94 L8 50Z";

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function CharacterCard({
  character,
  role,
  power,
  side,
  idle,
  lungeKey,
  hitKey,
  compact,
}: Props) {
  const pal = paletteFor(character.anime);
  const dir = side === "B" ? -1 : 1;
  const showImg = SHOW_IMAGES && !!character.immagine_url;
  return (
    <motion.div
      key={`${lungeKey ?? 0}-${hitKey ?? 0}`}
      data-testid={side ? `card-${side}` : undefined}
      className={`relative grid aspect-[3/4.1] grid-rows-[auto_1fr_auto] rounded-2xl border-[3px] border-white p-3 text-white shadow-xl ${
        compact ? "w-28 text-[11px]" : "w-[min(38vw,210px)] text-sm"
      }`}
      style={{ background: `linear-gradient(160deg, ${pal.from}, ${pal.to})` }}
      initial={false}
      animate={{
        opacity: idle ? 0.35 : 1,
        scale: idle ? 0.92 : 1,
        x: lungeKey ? [0, 38 * dir, 0] : 0,
        rotate: lungeKey ? [0, 5 * dir, 0] : 0,
        filter: hitKey ? ["brightness(1)", "brightness(2.2)", "brightness(1)"] : "brightness(1)",
      }}
      transition={{ duration: 0.45 }}
    >
      <div className="flex items-start justify-between gap-1 font-extrabold">
        <span>{role ?? pal.label}</span>
        <span className="text-2xl leading-none">{power ?? character.rating}</span>
      </div>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={character.immagine_url!}
          alt={character.nome}
          className="h-full w-full rounded-lg object-cover"
        />
      ) : (
        <svg viewBox="0 0 100 100" aria-hidden="true" className="h-full max-h-28 w-full">
          <path
            d={SHAPES[role ?? ""] ?? DEFAULT_SHAPE}
            fill="rgb(255 255 255 / .18)"
            stroke="#fff"
            strokeWidth="3"
          />
          <text x="50" y="62" textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff">
            {initials(character.nome)}
          </text>
        </svg>
      )}
      <div>
        <div className="font-extrabold leading-tight">{character.nome}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {character.tags.map((t) => (
            <span key={t} className="rounded bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">
              {t}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
