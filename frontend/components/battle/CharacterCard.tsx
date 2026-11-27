"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import Carta from "@/components/carta/Carta";
import { paletteFor } from "@/lib/animePalette";
import type { Character } from "@/lib/types/match";
import { ARCH_NOMI } from "@/lib/battle/labels";
import CardArt from "./CardArt";

interface Props {
  character: Pick<Character, "nome" | "anime" | "rating"> & {
    arch?: string;
    mossa?: { nome: string };
    immagine_url?: string | null;
    forma?: string | null;
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

export function rarity(rating: number) {
  if (rating >= 90)
    return {
      name: "Leggendaria",
      frame: "linear-gradient(160deg,#ffe680,#f08a00)",
      glow: "rgb(255 190 40 / .55)",
      foil: true,
    };
  if (rating >= 82)
    return {
      name: "Epica",
      frame: "linear-gradient(160deg,#ff7cc4,#7b3df0)",
      glow: "rgb(160 90 255 / .5)",
      foil: true,
    };
  if (rating >= 72)
    return {
      name: "Rara",
      frame: "linear-gradient(160deg,#58d6f5,#1378b8)",
      glow: "rgb(53 150 255 / .4)",
      foil: false,
    };
  return {
    name: "Comune",
    frame: "linear-gradient(160deg,#77747e,#4a4850)",
    glow: "rgb(180 190 210 / .18)",
    foil: false,
  };
}

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
  const uid = useId().replace(/:/g, "");
  const sizeClass = compact
    ? "w-28 text-[11px]"
    : fluid
      ? "w-full max-w-[230px] text-sm"
      : "w-[min(42vw,230px)] text-sm";
  const tiltable = !side;
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!tiltable) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const st = e.currentTarget.style;
    st.setProperty("--rx", `${((0.5 - y) * 16).toFixed(1)}deg`);
    st.setProperty("--ry", `${((x - 0.5) * 18).toFixed(1)}deg`);
    st.setProperty("--mx", `${(x * 100).toFixed(0)}%`);
    st.setProperty("--my", `${(y * 100).toFixed(0)}%`);
    st.setProperty("--gl", "1");
  };
  const onLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = e.currentTarget.style;
    st.setProperty("--rx", "0deg");
    st.setProperty("--ry", "0deg");
    st.setProperty("--gl", "0");
  };
  return (
    <div
      className={`tcg-persp ${sizeClass}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
    >
      <div className="tcg-tilt">
        <motion.div
          key={`${lungeKey ?? 0}-${hitKey ?? 0}`}
          data-testid={side ? `card-${side}` : undefined}
          className="w-full text-white"
          initial={false}
          animate={{
            opacity: idle ? 0.35 : 1,
            scale: idle ? 0.92 : 1,
            x: lungeKey ? [0, 38 * dir, 0] : 0,
            rotate: lungeKey ? [0, 5 * dir, 0] : 0,
            filter: hitKey
              ? ["brightness(1)", "brightness(2.2)", "brightness(1)"]
              : "brightness(1)",
          }}
          transition={{ duration: 0.45 }}
        >
          <Carta
            nome={character.nome}
            anime={character.anime}
            rating={character.rating}
            immagine={character.immagine_url}
            potenza={power ?? character.rating}
            forma={character.forma}
            title={rar.name}
            sotto={[
              character.arch ? (ARCH_NOMI[character.arch] ?? character.arch) : (role ?? pal.label),
              character.mossa?.nome ?? rar.name,
            ].join(" · ")}
            arte={
              <CardArt
                name={character.nome}
                anime={character.anime}
                role={role ?? "Supporto"}
                idPrefix={uid}
              />
            }
          />
        </motion.div>
      </div>
    </div>
  );
}
