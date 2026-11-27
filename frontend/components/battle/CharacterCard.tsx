"use client";

import Icon from "@/components/Icon";
import { motion } from "framer-motion";
import { useId, useState } from "react";
import { SHOW_IMAGES } from "@/lib/api";
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
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = SHOW_IMAGES && !!character.immagine_url && !imgFailed;
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
          className={`tcg ${rar.foil ? "tcg-foil" : ""} aspect-[3/4.2] w-full text-white`}
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
            filter: hitKey
              ? ["brightness(1)", "brightness(2.2)", "brightness(1)"]
              : "brightness(1)",
          }}
          transition={{ duration: 0.45 }}
        >
          <div className="tcg-inner">
            <div className="tcg-art">
              {showImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.immagine_url!}
                  alt={character.nome}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              ) : (
                <CardArt
                  name={character.nome}
                  anime={character.anime}
                  role={role ?? "Supporto"}
                  idPrefix={uid}
                />
              )}
            </div>
            <span className="tcg-glare" aria-hidden="true" />
            {/* stessa carta del Duello: arte a tutta carta, potenza in alto a destra, nome in basso */}
            <div
              className="display absolute right-[0.5em] top-[0.5em] z-[3] grid min-w-[2.1em] place-items-center rounded-[0.6em] border-2 border-white/80 bg-black/80 px-[0.3em] py-[0.1em] text-[1.9em] font-black leading-none text-white shadow-lg"
              title={rar.name}
            >
              {power ?? character.rating}
            </div>
            {character.forma && (
              <span className="absolute left-[0.5em] top-[0.5em] z-[3] max-w-[60%] truncate rounded bg-black/70 px-1.5 py-0.5 text-[0.6em] font-extrabold uppercase tracking-wider text-amber-200">
                {character.forma}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-[#0b0818] via-[#0b0818]/85 to-transparent px-[0.7em] pb-[0.55em] pt-[2.2em]">
              <div className="display truncate text-[1.45em] font-black leading-none drop-shadow">
                {character.nome}
              </div>
              <div className="mt-[0.2em] truncate text-[0.75em] font-semibold text-white/70">
                {character.arch
                  ? (ARCH_NOMI[character.arch] ?? character.arch)
                  : (role ?? pal.label)}{" "}
                · {rar.name}
              </div>
              {character.mossa && (
                <div className="mt-[0.2em] truncate text-[0.68em] font-bold text-amber-200">
                  <Icon name="bolt" className="size-[1em]" /> {character.mossa.nome}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
