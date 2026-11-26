"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { SHOW_IMAGES } from "@/lib/api";
import it from "@/i18n/it.json";
import { paletteFor } from "@/lib/animePalette";
import { FILE, ROLES, STAT_NOMI } from "@/lib/battle/labels";
import { useBattlePlayer, type Side } from "@/lib/battle/usePlayer";
import type { MatchResult } from "@/lib/types/match";
import CardArt from "./CardArt";
import Fighter from "./Fighter";

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

function TeamBar({ side, name, pct }: { side: Side; name: string; pct: number }) {
  const color =
    side === "A"
      ? "linear-gradient(90deg,#35e0ff,#2f6bff)"
      : "linear-gradient(90deg,#ff8a3d,#ff3d81)";
  return (
    <div className={`grid gap-1 ${side === "B" ? "text-right" : ""}`}>
      <div className="display truncate text-base font-bold">{name}</div>
      <div
        className="relative h-4 overflow-hidden rounded-full border border-white/30 bg-black/50"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-label={name}
      >
        <motion.i
          className="absolute inset-0 rounded-full"
          style={{ background: color, transformOrigin: side === "A" ? "left" : "right" }}
          animate={{ scaleX: pct / 100 }}
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

  const pct = (side: Side) => {
    const max = result.unita[side].reduce((t, u) => t + u.hp, 0);
    return (s.hp[side].reduce((t, h) => t + h, 0) / max) * 100;
  };

  /** Chi ha fatto più danni: il "migliore in campo" mostrato a fine scontro. */
  const mvp = useMemo(() => {
    const tot: Record<string, number> = {};
    for (const e of result.eventi) {
      if (e.tipo !== "azione") continue;
      for (const x of e.esiti) {
        if (x.delta < 0 && x.lato !== e.da)
          tot[`${e.da}${e.idx}`] = (tot[`${e.da}${e.idx}`] ?? 0) - x.delta;
      }
    }
    const best = Object.entries(tot).sort((a, b) => b[1] - a[1])[0];
    if (!best) return null;
    const side = best[0][0] as Side;
    return { nome: result.squadre[side].members[Number(best[0].slice(1))].nome, danno: best[1] };
  }, [result]);

  const column = (side: Side, fila: number[]) => (
    <div key={fila.join("-")} className="flex flex-col justify-center gap-[clamp(3px,0.8vw,10px)]">
      {fila.map((idx) => (
        <Fighter
          key={idx}
          ch={result.squadre[side].members[idx]}
          role={ROLES[idx]}
          side={side}
          hp={s.hp[side][idx]}
          maxhp={result.unita[side][idx].hp}
          energia={s.energia[side][idx]}
          scudo={s.scudo[side][idx]}
          acting={s.actor?.side === side && s.actor.idx === idx}
          special={!!s.actor?.special}
          hitN={s.hits[`${side}${idx}`] ?? 0}
          floats={s.floats.filter((f) => f.side === side && f.idx === idx)}
        />
      ))}
    </div>
  );

  const cut =
    s.banner?.special && s.banner.side !== undefined && s.banner.idx !== undefined
      ? result.squadre[s.banner.side].members[s.banner.idx]
      : null;
  const pal = cut ? paletteFor(cut.anime) : null;

  return (
    <section aria-label={it.battle.titolo} className="w-full">
      <motion.div
        key={s.shake}
        animate={s.shake ? { x: [0, -6, 6, -4, 3, 0], y: [0, 3, -3, 2, -1, 0] } : {}}
        transition={{ duration: 0.45 }}
        className="relative isolate overflow-hidden rounded-3xl border border-white/20 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,255,.45),transparent_60%),radial-gradient(ellipse_at_50%_110%,rgba(255,61,129,.35),transparent_55%),linear-gradient(180deg,#120e26,#0a0814)] shadow-[0_20px_60px_rgba(0,0,0,.6)]"
        data-testid="arena"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
          <TeamBar side="A" name={A.nome} pct={pct("A")} />
          <div className="text-center">
            <div className="display text-3xl font-bold text-gold">VS</div>
            <small className="block text-xs font-bold opacity-70" data-testid="round">
              {s.turno ? `${it.battle.turno} ${s.turno}` : it.battle.pronto}
            </small>
          </div>
          <TeamBar side="B" name={B.nome} pct={pct("B")} />
        </div>

        <div className="flex items-stretch justify-center gap-[clamp(6px,2vw,28px)] px-3 pb-8 pt-2">
          <div className="flex gap-[clamp(4px,1vw,14px)]">
            {[...FILE].reverse().map((f) => column("A", f))}
          </div>
          <div className="w-px self-stretch bg-gradient-to-b from-transparent via-white/25 to-transparent" />
          <div className="flex gap-[clamp(4px,1vw,14px)]">{FILE.map((f) => column("B", f))}</div>
        </div>

        {!reduced && (
          <AnimatePresence>
            <motion.div
              key={`flash-${s.flash}`}
              className="pointer-events-none absolute inset-0 z-[2] bg-white"
              initial={{ opacity: s.flash ? 0.6 : 0 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          </AnimatePresence>
        )}

        <AnimatePresence>
          {s.banner && cut && pal && (
            <motion.div
              key={`cut-${s.banner.title}-${s.actor?.n}`}
              data-testid="banner"
              className="pointer-events-none absolute inset-x-0 top-[22%] z-[4] flex h-[40%] items-center overflow-hidden"
              initial={{ opacity: 0, scaleY: 0.3 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.3 }}
              transition={{ duration: 0.16 }}
              style={{
                background: `linear-gradient(100deg, ${pal.to}ee, ${pal.from}cc 60%, transparent)`,
              }}
            >
              <motion.div
                className={`relative h-[140%] aspect-[3/4] overflow-hidden rounded-2xl border-2 border-white ${
                  s.banner.side === "B" ? "ml-auto mr-[8%] order-2" : "ml-[8%]"
                }`}
                initial={{ x: s.banner.side === "B" ? 80 : -80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                {SHOW_IMAGES && cut.immagine_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cut.immagine_url}
                    alt={cut.nome}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover object-top"
                  />
                ) : (
                  <CardArt name={cut.nome} anime={cut.anime} role="Capitano" idPrefix="cut" />
                )}
              </motion.div>
              <motion.div
                className={`absolute top-1/2 -translate-y-1/2 ${s.banner.side === "B" ? "left-[6%] text-left" : "right-[6%] text-right"}`}
                initial={{ x: s.banner.side === "B" ? -60 : 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.05 }}
              >
                <div className="display text-[clamp(20px,4.6vw,52px)] font-bold leading-none text-yellow-300 [-webkit-text-stroke:2px_#1a0e2a]">
                  {s.banner.title}
                </div>
                <div className="mt-1 text-[clamp(11px,1.8vw,18px)] font-bold uppercase tracking-widest text-white">
                  {s.banner.sub}
                </div>
              </motion.div>
            </motion.div>
          )}
          {s.banner && !cut && (
            <motion.div
              key={s.banner.title}
              data-testid="banner"
              className={`pointer-events-none absolute left-1/2 top-[48%] z-[4] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center font-black text-yellow-300 [-webkit-text-stroke:3px_#2a1b10] ${
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
            <div data-testid="result" className="panel mt-4 space-y-4 p-5">
              <h2 className="text-3xl font-bold text-gold">
                {it.battle.vince} {result.squadre[result.vincitore].nome} · {result.totali.A}% a{" "}
                {result.totali.B}%
              </h2>
              <p className="text-sm muted">
                {result.turni} {it.battle.turni}
                {mvp && ` · ${it.battle.migliore}: ${mvp.nome} (${mvp.danno})`}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["A", "B"] as const).map((side) => {
                  const sin = result.sinergie.filter((x) => x.lato === side);
                  return (
                    <div key={side}>
                      <h3 className="display mb-1 text-lg font-bold">
                        {result.squadre[side].nome} · {it.battle.sinergie}
                      </h3>
                      {sin.length === 0 ? (
                        <p className="text-sm muted">{it.battle.nessunaSinergia}</p>
                      ) : (
                        <ul className="flex flex-wrap gap-1">
                          {sin.map((x) => (
                            <li key={x.nome} className="chip">
                              {x.nome} ×{x.membri} · +{x.valore}% {STAT_NOMI[x.stat] ?? x.stat}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <ol
            hidden={s.log.length === 0}
            className="panel mt-4 max-h-72 overflow-auto p-4 text-sm"
            aria-label={it.battle.cronaca}
          >
            {[...s.log].reverse().map((e, i) => (
              <li key={i} className="border-b border-dashed border-white/10 py-1.5">
                <span className="muted">T{e.turno}</span>{" "}
                <b>{result.squadre[e.da].members[e.idx].nome}</b>: {e.mossa}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
