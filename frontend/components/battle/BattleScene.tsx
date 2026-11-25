"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import it from "@/i18n/it.json";
import { useBattlePlayer } from "@/lib/battle/usePlayer";
import type { MatchResult } from "@/lib/types/match";
import CharacterCard from "./CharacterCard";

const ROLES = ["Capitano", "Vice", "Tank", "Danno", "Supporto", "Supporto II", "Guaritore"];

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(q.matches);
    const f = () => setReduced(q.matches);
    q.addEventListener("change", f);
    return () => q.removeEventListener("change", f);
  }, []);
  return reduced;
}

function HpBar({ side, name, value }: { side: "A" | "B"; name: string; value: number }) {
  const color =
    side === "A"
      ? "linear-gradient(90deg,#35e0ff,#2f6bff)"
      : "linear-gradient(90deg,#ff8a3d,#ff3d81)";
  return (
    <div className={`grid gap-1 ${side === "B" ? "text-right" : ""}`}>
      <div className="display truncate text-base font-bold">{name}</div>
      <div
        className="relative h-5 overflow-hidden rounded-full border border-white/30 bg-black/50"
        role="progressbar"
        aria-valuenow={value}
        aria-label={name}
      >
        <motion.i
          className="absolute inset-0 rounded-full"
          style={{ background: color, transformOrigin: side === "A" ? "left" : "right" }}
          animate={{ scaleX: value / 100 }}
          transition={{ duration: 0.35 }}
        />
      </div>
    </div>
  );
}

export default function BattleScene({
  result,
  autoplay = false,
  onDone,
  hideChrome = false,
}: {
  result: MatchResult;
  autoplay?: boolean;
  onDone?: () => void;
  hideChrome?: boolean;
}) {
  const reduced = useReducedMotion();
  const [speed, setSpeed] = useState(1);
  const [sound, setSound] = useState(true);
  const { state: s, play, skip } = useBattlePlayer(result, { speed, sound, reduced });
  const { A, B } = result.squadre;

  useEffect(() => {
    if (autoplay) void play();
  }, [autoplay, play]);

  useEffect(() => {
    if (s.phase === "done") onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase]);

  const bonusText = (e: MatchResult["eventi"][number]) => {
    switch (e.tipo) {
      case "ingresso":
        return `${A.nome} vs ${B.nome}`;
      case "duello":
        return `${e.ruolo}: ${A.members[e.idx].nome} vs ${B.members[e.idx].nome}`;
      case "attacco":
        return `${result.squadre[e.da].members[e.idx].nome}: −${e.danno}`;
      case "counter":
        return `Counter ${result.squadre[e.da].nome} (${e.rel}, +${e.bonus}): −${e.danno}`;
      case "combo":
        return `Combo ${e.nome} (+${e.bonus}): −${e.danno}`;
      case "ko":
        return `K.O.! Vince ${result.squadre[e.da].nome}`;
    }
  };

  return (
    <section aria-label={it.battle.titolo} className="w-full">
      <motion.div
        key={s.shake}
        animate={s.shake ? { x: [0, -6, 6, -4, 3, 0], y: [0, 3, -3, 2, -1, 0] } : {}}
        transition={{ duration: 0.45 }}
        className="relative isolate min-h-[380px] overflow-hidden rounded-3xl border border-white/20 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,255,.45),transparent_60%),radial-gradient(ellipse_at_50%_110%,rgba(255,61,129,.35),transparent_55%),linear-gradient(180deg,#120e26,#0a0814)] shadow-[0_20px_60px_rgba(0,0,0,.6)]"
        data-testid="arena"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
          <HpBar side="A" name={A.nome} value={s.hp.A} />
          <div className="display text-center text-3xl font-bold text-gold">
            VS
            <small className="block text-xs font-bold opacity-70" data-testid="round">
              {s.round || it.battle.pronto}
            </small>
          </div>
          <HpBar side="B" name={B.nome} value={s.hp.B} />
        </div>
        <div className="grid grid-cols-2 items-center justify-items-center px-4 pb-8 pt-2">
          {(["A", "B"] as const).map((side) => (
            <CharacterCard
              key={side}
              side={side}
              character={result.squadre[side].members[s.duel]}
              role={ROLES[s.duel]}
              power={result.potenze[side][s.duel]}
              idle={s.loser === side}
              lungeKey={s.lunge?.side === side ? s.lunge.n : undefined}
              hitKey={s.hit?.side === side ? s.hit.n : undefined}
            />
          ))}
        </div>
        {!reduced && (
          <AnimatePresence>
            <motion.div
              key={`flash-${s.flash}`}
              className="pointer-events-none absolute inset-0 z-[2] bg-white"
              initial={{ opacity: s.flash ? 0.75 : 0 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          </AnimatePresence>
        )}
        <div className="pointer-events-none absolute inset-0 z-[3]">
          {s.floats.map((f) => (
            <motion.div
              key={f.id}
              className="absolute top-1/3 text-5xl font-black text-yellow-300 [-webkit-text-stroke:2px_#2a1b10] drop-shadow-[0_0_12px_rgba(255,200,60,.8)]"
              style={{ left: f.side === "A" ? "25%" : "70%" }}
              initial={{ y: 10, scale: 0.6, opacity: 0 }}
              animate={{ y: -60, scale: 1.15, opacity: [0, 1, 0] }}
              transition={{ duration: 0.9 }}
            >
              −{f.n}
            </motion.div>
          ))}
        </div>
        <AnimatePresence>
          {s.banner && (
            <motion.div
              key={s.banner.title}
              data-testid="banner"
              className={`pointer-events-none absolute left-1/2 top-[52%] z-[4] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center font-black text-yellow-300 [-webkit-text-stroke:3px_#2a1b10] ${
                s.banner.ko ? "text-7xl" : "text-4xl"
              }`}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {s.banner.title}
              {s.banner.sub && (
                <small className="mt-2 block text-base text-white [-webkit-text-stroke:2px_#2a1b10]">
                  {s.banner.sub}
                </small>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {s.caption && (
        <p
          data-testid="commentary"
          aria-live="polite"
          className="panel mt-3 px-4 py-3 text-center text-base font-bold text-amber-50"
        >
          {s.caption}
        </p>
      )}

      {!hideChrome && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" onClick={() => void play()}>
              {s.phase === "idle" ? it.battle.combatti : it.battle.rigioca}
            </button>
            <button className="btn" onClick={skip}>
              {it.battle.salta}
            </button>
            <button
              className="btn"
              aria-pressed={speed === 2}
              onClick={() => setSpeed(speed === 1 ? 2 : 1)}
            >
              {it.battle.velocita}
            </button>
            <button className="btn" aria-pressed={sound} onClick={() => setSound(!sound)}>
              {it.battle.suono}
            </button>
            <span className="text-sm muted">Seed #{result.seed}</span>
          </div>

          {s.phase === "done" && (
            <div data-testid="result" className="panel mt-4 p-5">
              <h2 className="text-3xl font-bold text-gold">
                {it.battle.vince} {result.squadre[result.vincitore].nome} · {result.totali.A} a{" "}
                {result.totali.B}
              </h2>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">{it.battle.voce}</th>
                    <th>{A.nome}</th>
                    <th>{B.nome}</th>
                  </tr>
                </thead>
                <tbody>
                  {(["base", "ruolo", "firma", "forma", "counter", "duo"] as const).map((k) => (
                    <tr key={k} className="text-center">
                      <td className="text-left capitalize">{k}</td>
                      <td>{result.dettaglio.A[k]}</td>
                      <td>{result.dettaglio.B[k]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ol
            className="panel mt-4 max-h-72 overflow-auto p-4 text-sm"
            aria-label={it.battle.cronaca}
          >
            {s.log.map((e, i) => (
              <li key={i} className="border-b border-dashed border-white/10 py-1.5">
                {bonusText(e)}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
