"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchResult } from "../types/match";
import { commentary } from "./commentary";
import { baseMs, timeScale } from "./schedule";
import { beep } from "./sound";

export type Side = "A" | "B";
type Ev = MatchResult["eventi"][number];
export type Azione = Extract<Ev, { tipo: "azione" }>;
const other = (s: Side): Side => (s === "A" ? "B" : "A");

export interface Banner {
  title: string;
  sub?: string;
  side?: Side;
  idx?: number;
  ko?: boolean;
  special?: boolean;
}
export interface Float {
  id: number;
  side: Side;
  idx: number;
  text: string;
  kind: "dmg" | "crit" | "heal" | "miss" | "stun" | "ko";
}
export interface PlayerState {
  phase: "idle" | "playing" | "done";
  hp: Record<Side, number[]>;
  energia: Record<Side, number[]>;
  scudo: Record<Side, number[]>;
  turno: number;
  actor: { side: Side; idx: number; n: number; special: boolean } | null;
  /** contatore dei colpi subiti da ogni combattente: cambia a ogni colpo e fa partire l'animazione */
  hits: Record<string, number>;
  floats: Float[];
  banner: Banner | null;
  shake: number;
  flash: number;
  log: Azione[];
  caption: string;
  vincitore: Side | null;
}

export function initialState(result: MatchResult): PlayerState {
  const hp = { A: result.unita.A.map((u) => u.hp), B: result.unita.B.map((u) => u.hp) };
  const zero = () => ({ A: Array(7).fill(0) as number[], B: Array(7).fill(0) as number[] });
  return {
    phase: "idle",
    hp,
    energia: zero(),
    scudo: zero(),
    turno: 0,
    actor: null,
    hits: {},
    floats: [],
    banner: null,
    shake: 0,
    flash: 0,
    log: [],
    caption: "",
    vincitore: null,
  };
}

interface Options {
  speed: number;
  sound: boolean;
  reduced: boolean;
}

export function useBattlePlayer(result: MatchResult, opts: Options) {
  const [state, setState] = useState<PlayerState>(() => initialState(result));
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
    const fx = (name: "shake" | "flash") =>
      !optRef.current.reduced && patch((s) => ({ [name]: s[name] + 1 }) as Partial<PlayerState>);

    patch({ ...initialState(result), phase: "playing" });
    for (const [n, e] of result.eventi.entries()) {
      if (!alive()) return;
      const base = baseMs(e);
      patch({ caption: commentary(result, e, n) });
      switch (e.tipo) {
        case "ingresso":
          snd(330, 0.15);
          patch({
            hp: e.stato.hp as Record<Side, number[]>,
            energia: e.stato.energia as Record<Side, number[]>,
            scudo: e.stato.scudo as Record<Side, number[]>,
            banner: {
              title: "FIGHT!",
              sub: `${result.squadre.A.nome} vs ${result.squadre.B.nome}`,
            },
          });
          await sleep(base);
          patch({ banner: null });
          break;
        case "turno":
          patch({ turno: e.n, actor: null });
          await sleep(base);
          break;
        case "azione": {
          const att = result.squadre[e.da].members[e.idx];
          const id = ++counter.current;
          patch({ actor: { side: e.da, idx: e.idx, n: id, special: e.speciale } });
          if (e.speciale) {
            snd(520, 0.18, "sawtooth", 0.06);
            patch({
              banner: { title: e.mossa, sub: att.nome, side: e.da, idx: e.idx, special: true },
            });
            await sleep(base * 0.55);
            patch({ banner: null });
            fx("flash");
          } else {
            await sleep(base * 0.3);
          }
          const floats: Float[] = [];
          const hits: Record<string, number> = {};
          for (const x of e.esiti) {
            const fid = ++counter.current;
            const key = `${x.lato}${x.idx}`;
            if (x.schivata)
              floats.push({ id: fid, side: x.lato, idx: x.idx, text: "MISS", kind: "miss" });
            else if (x.stordito)
              floats.push({ id: fid, side: x.lato, idx: x.idx, text: "STUN", kind: "stun" });
            else if (x.delta < 0) {
              hits[key] = fid;
              floats.push({
                id: fid,
                side: x.lato,
                idx: x.idx,
                text: `${-x.delta}`,
                kind: x.crit ? "crit" : "dmg",
              });
            } else if (x.delta > 0)
              floats.push({ id: fid, side: x.lato, idx: x.idx, text: `+${x.delta}`, kind: "heal" });
          }
          const anyKo = e.esiti.some((x) => x.ko);
          snd(e.da === "A" ? 460 : 380, 0.06);
          if (anyKo) snd(150, 0.3, "sawtooth", 0.1);
          if (e.speciale || anyKo || e.esiti.some((x) => x.crit)) fx("shake");
          patch((s) => ({
            hp: e.stato.hp as Record<Side, number[]>,
            energia: e.stato.energia as Record<Side, number[]>,
            scudo: e.stato.scudo as Record<Side, number[]>,
            hits: { ...s.hits, ...hits },
            floats: [...s.floats, ...floats],
            log: [...s.log, e],
          }));
          setTimeout(
            () =>
              patch((s) => ({
                floats: s.floats.filter((f) => !floats.some((g) => g.id === f.id)),
              })),
            1100,
          );
          await sleep(e.speciale ? base * 0.45 : base * 0.7);
          break;
        }
        case "fine":
          patch({ actor: null, vincitore: e.vincitore });
          fx("flash");
          fx("shake");
          snd(180, 0.5, "sawtooth", 0.12);
          patch({ banner: { title: e.motivo === "ko" ? "K.O." : "TEMPO", ko: true } });
          await sleep(base * 0.4);
          patch({
            banner: {
              title: "VINCE",
              sub: `${result.squadre[e.vincitore].nome} · ${result.totali[e.vincitore]}% contro ${result.totali[other(e.vincitore)]}%`,
            },
          });
          await sleep(base * 0.6);
          break;
      }
    }
    if (alive()) patch({ phase: "done", banner: null });
  }, [result, patch]);

  const skip = useCallback(() => {
    token.current++;
    const azioni = result.eventi.filter((e): e is Azione => e.tipo === "azione");
    const ultimo = azioni[azioni.length - 1];
    const base = initialState(result);
    setState({
      ...base,
      phase: "done",
      hp: (ultimo?.stato.hp ?? base.hp) as Record<Side, number[]>,
      energia: (ultimo?.stato.energia ?? base.energia) as Record<Side, number[]>,
      scudo: (ultimo?.stato.scudo ?? base.scudo) as Record<Side, number[]>,
      turno: result.turni,
      log: azioni,
      vincitore: result.vincitore,
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
