"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchResult } from "../types/match";
import { commentary } from "./commentary";
import { BASE_MS, timeScale } from "./schedule";
import { beep } from "./sound";

type Side = "A" | "B";
type Ev = MatchResult["eventi"][number];
const other = (s: Side): Side => (s === "A" ? "B" : "A");

export interface Banner {
  title: string;
  sub?: string;
  ko?: boolean;
}
export interface Float {
  id: number;
  side: Side;
  n: number;
}
export interface PlayerState {
  phase: "idle" | "playing" | "done";
  hp: Record<Side, number>;
  duel: number;
  banner: Banner | null;
  floats: Float[];
  lunge: { side: Side; n: number } | null;
  hit: { side: Side; n: number } | null;
  shake: number;
  flash: number;
  loser: Side | null;
  log: Ev[];
  round: string;
  caption: string;
}

const INITIAL: PlayerState = {
  phase: "idle",
  hp: { A: 100, B: 100 },
  duel: 0,
  banner: null,
  floats: [],
  lunge: null,
  hit: null,
  shake: 0,
  flash: 0,
  loser: null,
  log: [],
  round: "",
  caption: "",
};

interface Options {
  speed: number;
  sound: boolean;
  reduced: boolean;
}

export function useBattlePlayer(result: MatchResult, opts: Options) {
  const [state, setState] = useState<PlayerState>(INITIAL);
  const token = useRef(0);
  const optRef = useRef(opts);
  optRef.current = opts;
  const counter = useRef(0);

  const patch = useCallback(
    (p: Partial<PlayerState> | ((s: PlayerState) => Partial<PlayerState>)) => {
      setState((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) }));
    },
    [],
  );

  const play = useCallback(async () => {
    const my = ++token.current;
    const scale = timeScale(result.eventi);
    const sleep = (ms: number) =>
      new Promise<void>((r) => setTimeout(r, (ms * scale) / optRef.current.speed));
    const alive = () => my === token.current;
    const snd = (f: number, d?: number, t?: OscillatorType, v?: number) => {
      if (optRef.current.sound) beep(f, d, t, v);
    };
    const hits = (e: Ev & { da: Side; danno: number }) => {
      const t = other(e.da);
      const id = ++counter.current;
      patch((s) => ({
        hp: { ...s.hp, [t]: Math.max(0, s.hp[t] - e.danno) },
        hit: { side: t, n: id },
        floats: [...s.floats, { id, side: t, n: e.danno }],
      }));
      setTimeout(() => patch((s) => ({ floats: s.floats.filter((f) => f.id !== id) })), 1000);
    };
    const banner = async (b: Banner, ms: number) => {
      patch({ banner: b });
      await sleep(ms);
      patch({ banner: null });
    };
    const shake = () => !optRef.current.reduced && patch((s) => ({ shake: s.shake + 1 }));
    const flash = () => !optRef.current.reduced && patch((s) => ({ flash: s.flash + 1 }));
    const lunge = (side: Side) => patch({ lunge: { side, n: ++counter.current } });
    const win = result.vincitore;

    patch({ ...INITIAL, phase: "playing" });
    for (const [n, e] of result.eventi.entries()) {
      if (!alive()) return;
      const base = BASE_MS[e.tipo];
      patch((s) => ({ log: [...s.log, e], caption: commentary(result, e, n) }));
      switch (e.tipo) {
        case "ingresso":
          snd(330, 0.15);
          patch({ round: "round 1" });
          await banner(
            { title: "FIGHT!", sub: `${result.squadre.A.nome} vs ${result.squadre.B.nome}` },
            base,
          );
          break;
        case "duello":
          patch({ duel: e.idx, round: e.ruolo });
          await sleep(base);
          break;
        case "attacco":
          lunge(e.da);
          await sleep(base * 0.25);
          snd(e.da === "A" ? 520 : 420, 0.07);
          hits(e);
          await sleep(base * 0.75);
          break;
        case "counter":
          flash();
          snd(880, 0.12, "sawtooth");
          await banner({ title: "COUNTER!", sub: `${e.rel}  +${e.bonus}` }, base * 0.55);
          shake();
          hits(e);
          await sleep(base * 0.45);
          break;
        case "combo": {
          const m = result.squadre[e.da].members;
          snd(660, 0.1, "triangle");
          await banner(
            { title: "COMBO DUO!", sub: `${m[e.duo[0]].nome} + ${m[e.duo[1]].nome}` },
            base * 0.55,
          );
          lunge(e.da);
          await sleep(base * 0.1);
          shake();
          hits(e);
          await sleep(base * 0.35);
          break;
        }
        case "ko":
          patch({ duel: 0 });
          lunge(e.da);
          await sleep(base * 0.12);
          flash();
          shake();
          hits(e);
          snd(160, 0.5, "sawtooth", 0.12);
          patch({ loser: other(e.da) });
          await banner({ title: "K.O.", ko: true }, base * 0.3);
          patch({ round: "finale" });
          await banner(
            {
              title: "VINCE",
              sub: `${result.squadre[win].nome} · ${result.totali[win]} a ${result.totali[other(win)]}`,
            },
            base * 0.5,
          );
          break;
      }
    }
    if (alive()) patch({ phase: "done" });
  }, [result, patch]);

  const skip = useCallback(() => {
    token.current++;
    const hp = { A: 100, B: 100 };
    for (const e of result.eventi) {
      if (e.tipo !== "ingresso" && e.tipo !== "duello") hp[other(e.da)] -= e.danno;
    }
    setState({
      ...INITIAL,
      phase: "done",
      hp: { A: Math.max(0, hp.A), B: Math.max(0, hp.B) },
      loser: other(result.vincitore),
      log: result.eventi,
      round: "finale",
      caption: commentary(
        result,
        result.eventi[result.eventi.length - 1],
        result.eventi.length - 1,
      ),
    });
  }, [result]);

  useEffect(
    () => () => {
      token.current++;
    },
    [],
  );

  return { state, play, skip };
}
