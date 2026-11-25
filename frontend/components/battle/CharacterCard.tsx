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
  fluid?: boolean;
}

const SHAPES: Record<string, string> = {
  Capitano: "M50 8 L62 34 L92 36 L68 56 L76 88 L50 70 L24 88 L32 56 L8 36 L38 34Z",
  Tank: "M50 8 L88 22 L84 62 Q50 96 16 62 L12 22Z",
  Guaritore: "M40 10 H60 V40 H90 V60 H60 V90 H40 V60 H10 V40 H40Z",
};
export function rarity(rating: number) {
  if (rating >= 90)
    return {
      name: "Leggendaria",
      frame: "linear-gradient(145deg,#fff1a8,#ffb100 40%,#ff6a00 70%,#ffe27a)",
      glow: "rgb(255 190 40 / .55)",
      foil: true,
    };
  if (rating >= 82)
    return {
      name: "Epica",
      frame: "linear-gradient(145deg,#e0b3ff,#8b3dff 45%,#ff4fd8 80%,#c9a0ff)",
      glow: "rgb(160 90 255 / .5)",
      foil: true,
    };
  if (rating >= 72)
    return {
      name: "Rara",
      frame: "linear-gradient(145deg,#b9ecff,#2f8cff 50%,#35e0ff)",
      glow: "rgb(53 150 255 / .4)",
      foil: false,
    };
  return {
    name: "Comune",
    frame: "linear-gradient(145deg,#eef1f8,#8d97ad 50%,#cfd6e4)",
    glow: "rgb(180 190 210 / .18)",
    foil: false,
  };
}

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
  fluid,
}: Props) {
  const pal = paletteFor(character.anime);
  const rar = rarity(character.rating);
  const dir = side === "B" ? -1 : 1;
  const showImg = SHOW_IMAGES && !!character.immagine_url;
  return (
    <motion.div
      key={`${lungeKey ?? 0}-${hitKey ?? 0}`}
      data-testid={side ? `card-${side}` : undefined}
      className={`tcg ${rar.foil ? "tcg-foil" : ""} aspect-[3/4.2] text-white ${
        compact
          ? "w-28 text-[11px]"
          : fluid
            ? "w-full max-w-[230px] text-sm"
            : "w-[min(42vw,230px)] text-sm"
      }`}
      style={
        {
          "--frame": rar.frame,
          "--glow": rar.glow,
          "--from": pal.from,
          "--to": pal.to,
        } as React.CSSProperties
      }
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
      <div className="tcg-inner">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <div className="display truncate font-bold leading-tight">{character.nome}</div>
            <div className="truncate text-[0.7em] font-bold uppercase tracking-wider opacity-70">
              {role ?? pal.label}
            </div>
          </div>
          <div
            className="display grid shrink-0 place-items-center rounded-lg px-1.5 text-[1.7em] font-bold leading-none"
            style={{ background: rar.frame, color: "#1a1030" }}
          >
            {power ?? character.rating}
          </div>
        </div>
        <div className="tcg-art">
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.immagine_url!}
              alt={character.nome}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <span className="tcg-mono" style={{ fontSize: compact ? "4.5rem" : "8.5rem" }}>
                {initials(character.nome)}
              </span>
              <svg
                viewBox="0 0 100 100"
                aria-hidden="true"
                className="relative h-3/5 max-h-32 w-3/5 drop-shadow-[0_4px_10px_rgba(0,0,0,.5)]"
              >
                <path
                  d={SHAPES[role ?? ""] ?? DEFAULT_SHAPE}
                  fill="rgb(255 255 255 / .22)"
                  stroke="#fff"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <text x="50" y="62" textAnchor="middle" fontSize="28" fontWeight="800" fill="#fff">
                  {initials(character.nome)}
                </text>
              </svg>
            </>
          )}
        </div>
        <div>
          <div className="flex flex-wrap gap-1">
            {character.tags.map((t) => (
              <span
                key={t}
                className="rounded-md bg-white/12 px-1.5 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-wide"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between text-[0.62rem] font-bold uppercase tracking-widest opacity-60">
            <span>{pal.label}</span>
            <span>{rar.name}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
