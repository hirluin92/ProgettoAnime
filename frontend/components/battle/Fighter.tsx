"use client";

import Icon from "@/components/Icon";
import { AnimatePresence, motion } from "framer-motion";
import { SHOW_IMAGES } from "@/lib/api";
import { STATI_INFO } from "@/lib/battle/arene";
import { ARCH_NOMI } from "@/lib/battle/labels";
import type { Float } from "@/lib/battle/usePlayer";
import type { Character } from "@/lib/types/match";
import CardArt from "./CardArt";
import { rarity } from "./CharacterCard";

interface Props {
  ch: Character;
  role: string;
  side: "A" | "B";
  hp: number;
  maxhp: number;
  energia: number;
  scudo: number;
  acting: boolean;
  special: boolean;
  hitN: number;
  floats: Float[];
  /** stato alterato attivo (bruciatura, veleno, sigillo, corrosione) */
  status?: string | null;
}

const FLOAT_STYLE: Record<Float["kind"], string> = {
  dmg: "text-white",
  crit: "text-yellow-300 scale-125",
  heal: "text-emerald-300",
  miss: "text-sky-200 text-xs",
  stun: "text-fuchsia-300 text-xs",
  ko: "text-red-400",
  burn: "text-orange-400",
  poison: "text-lime-300",
  seal: "text-violet-300 text-xs",
};

export default function Fighter({
  ch,
  role,
  side,
  hp,
  maxhp,
  energia,
  scudo,
  acting,
  special,
  hitN,
  floats,
  status,
}: Props) {
  const rar = rarity(ch.rating);
  const ko = hp <= 0;
  const pct = Math.max(0, Math.min(100, (hp / maxhp) * 100));
  const dir = side === "A" ? 1 : -1;
  const showImg = SHOW_IMAGES && !!ch.immagine_url;
  const bar = pct > 55 ? "#4ade80" : pct > 25 ? "#fbbf24" : "#f43f5e";
  return (
    <div
      data-testid={`fighter-${side}-${role}`}
      data-ko={ko ? "1" : "0"}
      className="relative w-[clamp(46px,8.8vw,104px)]"
      title={`${ch.nome} · ${ARCH_NOMI[ch.arch] ?? ch.arch} · ${ch.mossa.nome}`}
    >
      <motion.div
        key={hitN}
        animate={{
          x: acting ? dir * (special ? 22 : 12) : 0,
          scale: acting ? (special ? 1.22 : 1.1) : 1,
          opacity: ko ? 0.28 : 1,
          filter: ko
            ? "grayscale(1)"
            : hitN
              ? ["brightness(2.4)", "brightness(1)"]
              : "brightness(1)",
          rotate: hitN && !ko ? [0, -3 * dir, 2 * dir, 0] : 0,
        }}
        transition={{ duration: 0.28 }}
        className="relative aspect-[3/4] overflow-hidden rounded-lg"
        style={{
          background: rar.frame,
          padding: 2,
          boxShadow: acting ? `0 0 18px 4px ${rar.glow}` : "0 4px 10px rgb(0 0 0 / .5)",
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[6px] bg-[#121115]">
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ch.immagine_url!}
              alt={ch.nome}
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          ) : (
            <CardArt name={ch.nome} anime={ch.anime} role={role} idPrefix={`f${side}${role}`} />
          )}
          {scudo > 0 && (
            <span className="absolute inset-x-0 top-0 h-1 bg-sky-300/90" aria-label="scudo" />
          )}
          {status && STATI_INFO[status] && !ko && (
            <span
              className="absolute left-0.5 top-1 text-[clamp(8px,1.2vw,14px)] drop-shadow"
              title={STATI_INFO[status].nome}
              data-testid="status"
            >
              <Icon name={STATI_INFO[status].icona} className="size-[0.9em]" />
            </span>
          )}
          <span className="absolute bottom-0 left-0 right-0 truncate bg-black/55 px-0.5 text-center text-[clamp(6px,0.9vw,10px)] font-bold leading-tight">
            {ch.nome.split(" ")[0]}
          </span>
        </div>
      </motion.div>
      <div
        className="mt-0.5 h-1.5 overflow-hidden bg-black/60"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-label={`Vita ${ch.nome}`}
      >
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: bar }}
        />
      </div>
      <div className="mt-px h-1 overflow-hidden bg-black/50">
        <div
          className="h-full bg-cyan-300 transition-[width] duration-300"
          style={{ width: `${energia}%` }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
        <AnimatePresence>
          {floats.map((f) => (
            <motion.div
              key={f.id}
              initial={{ y: 8, opacity: 0, scale: 0.6 }}
              animate={{ y: -34, opacity: [0, 1, 1, 0], scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className={`absolute inset-x-0 text-center text-[clamp(11px,1.6vw,20px)] font-black [-webkit-text-stroke:1.5px_#1b1a21] ${FLOAT_STYLE[f.kind]}`}
            >
              {f.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
