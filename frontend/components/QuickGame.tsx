"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import BattleScene from "@/components/battle/BattleScene";
import CharacterCard from "@/components/battle/CharacterCard";
import it from "@/i18n/it.json";
import { MOSSE_EFFETTO, PASSIVA_EFFETTO } from "@/lib/battle/effetti";
import { paletteFor } from "@/lib/animePalette";
import { ARCH_NOMI } from "@/lib/battle/labels";
import type { MatchResult } from "@/lib/types/match";

export interface Detail {
  mossa?: { nome: string; effetto?: string };
  passiva?: { nome: string; effetto?: string };
  tags?: string[];
  gruppi?: string[];
}
export interface Option {
  character: Parameters<typeof CharacterCard>[0]["character"] & { id: string } & Detail;
  cost: number;
}
export interface Options {
  seed: number;
  budget: number;
  roles: string[];
  options: Record<string, Option[]>;
}
export interface Played {
  id: string;
  result: MatchResult;
  spent: number;
  cpu_spent: number;
}

interface Props {
  title: string;
  load: () => Promise<Options>;
  play: (opts: Options, ids: string[]) => Promise<Played>;
  after?: ReactNode;
  header?: ReactNode;
}

export default function QuickGame({ title, load, play, after, header }: Props) {
  const [opts, setOpts] = useState<Options | null>(null);
  const [picks, setPicks] = useState<Option[]>([]);
  const [played, setPlayed] = useState<Played | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<Option | null>(null);

  const start = useCallback(async () => {
    setPicks([]);
    setPlayed(null);
    setError(null);
    setOpts(await load());
  }, [load]);
  useEffect(() => {
    start().catch((e: Error) => setError(e.message));
  }, [start]);

  const spent = picks.reduce((s, p) => s + p.cost, 0);
  const step = picks.length;

  const choose = async (o: Option) => {
    if (!opts) return;
    const next = [...picks, o];
    setFocus(null);
    setPicks(next);
    if (next.length === opts.roles.length) {
      try {
        setPlayed(
          await play(
            opts,
            next.map((p) => p.character.id),
          ),
        );
      } catch (e) {
        setError((e as Error).message);
      }
    }
  };

  if (error)
    return (
      <main className="mx-auto max-w-md p-6 pt-16">
        <div role="alert" className="panel space-y-4 p-6 text-center">
          <p className="text-lg font-bold">{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            {it.errori.riprova}
          </button>
        </div>
      </main>
    );
  if (!opts) return <main className="p-6">{it.stanza.connessione}</main>;

  if (played)
    return (
      <main className="mx-auto max-w-5xl space-y-3 p-4">
        <h1 className="text-5xl font-black leading-none">{title}</h1>
        <p className="text-sm muted">
          {it.veloce.speso}: {played.spent}/{opts.budget} · CPU: {played.cpu_spent}/{opts.budget} ·{" "}
          <a className="underline hover:text-white" href={`/partita/${played.id}`}>
            {it.battle.linkPartita}
          </a>
        </p>
        <BattleScene result={played.result} autoplay />
        {after}
      </main>
    );

  if (step >= opts.roles.length) return <main className="p-6">{it.veloce.calcolo}</main>;
  const role = opts.roles[step];
  const rolesLeft = opts.roles.length - step;
  const maxCost = opts.budget - spent - (rolesLeft - 1);
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="reveal space-y-1">
        <span className="eyebrow">{it.veloce.draft}</span>
        <h1 className="text-5xl font-black leading-none sm:text-6xl">{title}</h1>
      </div>
      {header}
      <div className="panel space-y-3 p-4">
        <ol className="flex flex-wrap gap-1.5" aria-hidden="true">
          {opts.roles.map((r, i) => (
            <li
              key={r}
              className={`rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wider transition ${
                i < step
                  ? "border-transparent bg-gradient-to-r from-pink-500 to-orange-400 text-white"
                  : i === step
                    ? "border-cyan-300 bg-cyan-300/15 text-cyan-100 shadow-[0_0_18px_rgb(53_224_255/0.35)]"
                    : "text-white/40"
              }`}
            >
              {i < step ? "✓ " : ""}
              {r}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p data-testid="step" className="text-lg">
            {it.veloce.scegli} <b className="text-gold">{role}</b> ({step + 1}/{opts.roles.length})
            · {it.stanza.budget}: <b data-testid="left">{opts.budget - spent}</b>
          </p>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-black/40"
          role="progressbar"
          aria-label={it.stanza.budget}
          aria-valuemin={0}
          aria-valuemax={opts.budget}
          aria-valuenow={opts.budget - spent}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-pink-500 transition-[width] duration-500"
            style={{ width: `${((opts.budget - spent) / opts.budget) * 100}%` }}
          />
        </div>
      </div>
      <CardDetail o={focus} />
      <ul className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {opts.options[role].map((o) => {
          const taken = picks.some((p) => p.character.id === o.character.id);
          return (
            <li key={o.character.id} className="w-full min-w-0">
              <button
                data-testid="option"
                disabled={o.cost > maxCost || taken}
                onClick={() => void choose(o)}
                onMouseEnter={() => setFocus(o)}
                onFocus={() => setFocus(o)}
                className="relative grid min-h-11 w-full grid-cols-[minmax(0,1fr)] justify-items-center gap-2 rounded-2xl p-1 transition duration-150 hover:z-20 hover:-translate-y-2 hover:scale-110 focus-visible:z-20 focus-visible:scale-110 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:scale-100"
                aria-label={`${o.character.nome}, costo ${o.cost}`}
              >
                <CharacterCard character={o.character} role={role} fluid />
                <span className="chip text-gold">
                  {it.veloce.costo} {o.cost}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <section aria-label={it.veloce.squadra} data-testid="recap" className="panel p-4">
        <h2 className="mb-3 text-xl font-bold">{it.veloce.squadra}</h2>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {opts.roles.map((r, i) => {
            const pick = picks[i];
            const current = i === step;
            return (
              <li
                key={r}
                data-testid={pick ? "recap-filled" : "recap-empty"}
                className={`grid min-w-0 grid-cols-[minmax(0,1fr)] justify-items-center gap-1 rounded-xl p-2 text-center ${
                  pick
                    ? ""
                    : current
                      ? "border-2 border-dashed border-pink-400 bg-pink-500/10"
                      : "border border-dashed border-white/20"
                }`}
              >
                {pick ? (
                  <CharacterCard character={pick.character} role={r} fluid />
                ) : (
                  <div className="grid aspect-[3/4.2] w-full max-w-[230px] place-items-center rounded-xl text-xs">
                    <div>
                      <div
                        className={`mx-auto mb-2 grid size-10 place-items-center rounded-full border text-lg ${
                          current
                            ? "border-pink-300/70 text-pink-200"
                            : "border-white/15 text-white/30"
                        }`}
                      >
                        {current ? "◆" : "+"}
                      </div>
                      <div className="display text-lg font-extrabold">{r}</div>
                      <div className={current ? "text-pink-200" : "muted"}>
                        {current ? it.veloce.ora : it.veloce.vuoto}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}

function CardDetail({ o }: { o: Option | null }) {
  const c = o?.character;
  return (
    <div
      className="panel grid min-h-[7.5rem] gap-3 p-4 text-sm sm:grid-cols-[1fr_1fr_auto]"
      aria-live="polite"
      data-testid="card-detail"
    >
      {!c ? (
        <p className="muted sm:col-span-3">{it.veloce.passaSopra}</p>
      ) : (
        <>
          <div className="min-w-0">
            <div className="display truncate text-2xl font-black leading-none">{c.nome}</div>
            <div className="mt-1 text-xs muted">
              {ARCH_NOMI[c.arch ?? ""] ?? c.arch} · {paletteFor(c.anime).label}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(c.tags ?? []).map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
              {(c.gruppi ?? []).map((g) => (
                <span key={g} className="chip text-cyan-200">
                  {g}
                </span>
              ))}
            </div>
          </div>
          <div className="min-w-0 space-y-1.5">
            {c.mossa && (
              <p>
                <b className="text-amber-200">⚡ {c.mossa.nome}</b>
                {c.mossa.effetto && (
                  <span className="muted">
                    {" "}
                    — {MOSSE_EFFETTO[c.mossa.effetto] ?? c.mossa.effetto}
                  </span>
                )}
              </p>
            )}
            {c.passiva && (
              <p>
                <b className="text-cyan-200">◆ {c.passiva.nome}</b>
                {c.passiva.effetto && (
                  <span className="muted">
                    {" "}
                    — {PASSIVA_EFFETTO[c.passiva.effetto] ?? c.passiva.effetto}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="display text-4xl font-black text-gold">{c.rating}</div>
            <div className="text-xs muted">
              {it.veloce.costo} {o?.cost}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
