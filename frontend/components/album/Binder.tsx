"use client";

import { APP_NAME } from "@/lib/constants";
import Icon from "@/components/Icon";
import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { fmt } from "@/components/duello/DuelloBoard";
import AlbumSlot from "@/components/album/AlbumSlot";
import it from "@/i18n/it.json";
import { paletteFor } from "@/lib/animePalette";
import type { AlbumCarta } from "@/lib/album";

// Raccoglitore di carte: copertina, un capitolo per anime (tasche 3×3 numerate), pagine che si sfogliano.

const PER_PAGINA = 9;
const NOMI_RARITA = it.album.rarita as Record<string, string>;
const COL_RARITA: Record<string, string> = {
  comune: "#8f8c96",
  rara: "#58d6f5",
  epica: "#ff7cc4",
  leggendaria: "#ffd21f",
};

type Pagina =
  | { tipo: "copertina" }
  | {
      tipo: "anime";
      anime: string;
      carte: { c: AlbumCarta; n: number }[];
      pag: number;
      tot: number;
    }
  | { tipo: "fine" };

interface Props {
  carte: AlbumCarta[];
  inMazzo: Set<string>;
  onCarta: (c: AlbumCarta) => void;
  onDettaglio: (c: AlbumCarta) => void;
}

export default function Binder({ carte, inMazzo, onCarta, onDettaglio }: Props) {
  const capitoli = useMemo(() => {
    const m = new Map<string, AlbumCarta[]>();
    for (const c of carte) m.set(c.carta.anime, [...(m.get(c.carta.anime) ?? []), c]);
    return [...m.entries()].map(([anime, lista]) => ({
      anime,
      lista,
      possedute: lista.filter((c) => c.posseduta).length,
    }));
  }, [carte]);

  const pagine = useMemo(() => {
    const p: Pagina[] = [{ tipo: "copertina" }];
    for (const cap of capitoli) {
      const tot = Math.ceil(cap.lista.length / PER_PAGINA);
      for (let i = 0; i < tot; i++)
        p.push({
          tipo: "anime",
          anime: cap.anime,
          pag: i + 1,
          tot,
          carte: cap.lista
            .slice(i * PER_PAGINA, (i + 1) * PER_PAGINA)
            .map((c, k) => ({ c, n: i * PER_PAGINA + k + 1 })),
        });
    }
    if (p.length % 2) p.push({ tipo: "fine" });
    return p;
  }, [capitoli]);

  const [doppia, setDoppia] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const f = () => setDoppia(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  // `pos` = indice di pagina; in doppia pagina si guarda la coppia (pos pari, pos+1)
  const [pos, setPos] = useState(0);
  const [giro, setGiro] = useState<{ da: number; a: number } | null>(null);
  const passo = doppia ? 2 : 1;
  const base = doppia ? pos - (pos % 2) : pos;
  const ultimo = doppia ? pagine.length - 2 : pagine.length - 1;

  const vai = useCallback(
    (nuovo: number) => {
      const n = Math.max(0, Math.min(ultimo, doppia ? nuovo - (nuovo % 2) : nuovo));
      if (giro || n === base) return;
      setGiro({ da: base, a: n });
    },
    [giro, base, ultimo, doppia],
  );
  const fine = () => {
    if (giro) setPos(giro.a);
    setGiro(null);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, select, textarea")) return;
      if (e.key === "ArrowRight") vai(base + passo);
      else if (e.key === "ArrowLeft") vai(base - passo);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [vai, base, passo]);

  const primaPagina = (anime: string) =>
    pagine.findIndex((p) => p.tipo === "anime" && p.anime === anime);
  const attivo = (() => {
    const p = pagine[base + (doppia ? 1 : 0)] ?? pagine[base];
    const q = pagine[base];
    return q?.tipo === "anime" ? q.anime : p?.tipo === "anime" ? p.anime : null;
  })();
  const accento = paletteFor(attivo ?? "").from;

  const pagina = (i: number): ReactNode => {
    const p = pagine[i];
    if (!p) return null;
    return (
      <PaginaView
        p={p}
        capitoli={capitoli}
        carte={carte}
        inMazzo={inMazzo}
        onCarta={onCarta}
        onDettaglio={onDettaglio}
        lato={i % 2 === 0 ? "sx" : "dx"}
      />
    );
  };

  const fwd = giro ? giro.a > giro.da : true;
  // pagine mostrate sotto e sulla pagina che gira
  const sx = giro ? (fwd ? giro.da : giro.a) : base;
  const dx = giro ? (fwd ? giro.a + 1 : giro.da + 1) : base + 1;
  const fronte = giro ? (fwd ? giro.da + 1 : giro.a + 1) : 0;
  const retro = giro ? (fwd ? giro.a : giro.da) : 0;

  const etichetta = doppia
    ? fmt(it.album.pagine, { a: base + 1, b: base + 2, tot: pagine.length })
    : fmt(it.album.pagina, { a: pos + 1, tot: pagine.length });

  return (
    <section
      className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]"
      data-testid="raccoglitore"
    >
      {/* indice dei capitoli */}
      <nav aria-label={it.album.indice} className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <h2 className="eyebrow mb-2">{it.album.indice}</h2>
        <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          <li className="shrink-0">
            <button
              className={`min-h-11 w-full border-2 px-3 py-2 text-left text-sm font-black uppercase tracking-wide transition-colors ${
                base === 0
                  ? "border-black bg-carta text-nero"
                  : "border-[rgb(243_236_221/0.2)] bg-[#17161b] hover:border-carta"
              }`}
              onClick={() => vai(0)}
            >
              {it.album.copertina}
            </button>
          </li>
          {capitoli.map((cap) => {
            const pal = paletteFor(cap.anime);
            const att = cap.anime === attivo;
            return (
              <li key={cap.anime} className="shrink-0 lg:shrink">
                <button
                  className={`relative w-full min-w-[9.5rem] overflow-hidden border-2 px-3 py-2 text-left transition-colors ${
                    att
                      ? "border-black bg-carta text-nero"
                      : "border-[rgb(243_236_221/0.2)] bg-[#17161b] hover:border-carta"
                  }`}
                  onClick={() => vai(primaPagina(cap.anime))}
                  data-testid={`capitolo-${cap.anime}`}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-2"
                    style={{ background: pal.from }}
                  />
                  <span className="display block pl-2 text-lg leading-tight tracking-wide">
                    {pal.label !== "Anime" ? pal.label : cap.anime}
                  </span>
                  <span className="mt-1 flex items-center gap-2 pl-2">
                    <span className="h-2 flex-1 overflow-hidden border border-black bg-black/60">
                      <span
                        className="block h-full"
                        style={{
                          width: `${(cap.possedute / cap.lista.length) * 100}%`,
                          background: pal.from,
                        }}
                      />
                    </span>
                    <span className="num text-[0.7rem]">
                      {cap.possedute}/{cap.lista.length}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 space-y-3">
        <div
          className="relative mx-auto"
          style={{
            width: doppia ? "min(100%, 1280px, calc((100vh - 12rem) * 1.33))" : "min(100%, 480px)",
            perspective: 2600,
          }}
        >
          {/* copertina in pelle */}
          <div
            className="relative rounded-[10px] border-2 border-black p-[1.8%]"
            style={{
              background: "#0a090c",
              boxShadow: `0 0 0 2px ${accento}, 9px 9px 0 2px #000`,
            }}
          >
            <div className="relative flex" style={{ transformStyle: "preserve-3d" }}>
              {doppia ? (
                <>
                  <div className="w-1/2">{pagina(sx)}</div>
                  <div className="w-1/2">{pagina(dx)}</div>
                </>
              ) : (
                <div className="w-full">{pagina(giro ? (fwd ? giro.a : giro.da) : pos)}</div>
              )}

              {/* pagina che gira */}
              {giro && doppia && (
                <motion.div
                  key={`${giro.da}-${giro.a}`}
                  className="absolute inset-y-0 left-1/2 w-1/2"
                  style={{ transformOrigin: "left center", transformStyle: "preserve-3d" }}
                  initial={{ rotateY: fwd ? 0 : -180 }}
                  animate={{ rotateY: fwd ? -180 : 0 }}
                  transition={{ duration: 0.95, ease: [0.45, 0.05, 0.25, 1] }}
                  onAnimationComplete={fine}
                >
                  <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                    {pagina(fronte)}
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 to-transparent" />
                  </div>
                  <div
                    className="absolute inset-0"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    {pagina(retro)}
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/45 to-transparent" />
                  </div>
                </motion.div>
              )}
              {giro && !doppia && (
                <motion.div
                  key={`s${giro.da}-${giro.a}`}
                  className="absolute inset-0"
                  style={{ transformOrigin: "left center" }}
                  initial={{ rotateY: fwd ? 0 : -100, opacity: 1 }}
                  animate={{ rotateY: fwd ? -100 : 0, opacity: fwd ? 0 : 1 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  onAnimationComplete={fine}
                >
                  {pagina(fwd ? giro.da : giro.a)}
                </motion.div>
              )}

              {/* dorso: ombra al centro del libro */}
              {doppia && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-[5%] -translate-x-1/2"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgb(0 0 0 / 0.55) 48%, rgb(255 255 255 / 0.08) 50%, rgb(0 0 0 / 0.55) 52%, transparent)",
                  }}
                />
              )}
              {/* tocca i bordi per sfogliare, o trascina */}
              <motion.div
                className="absolute inset-0 z-30 touch-pan-y"
                onPanEnd={(_, info) => {
                  if (info.offset.x < -60) vai(base + passo);
                  else if (info.offset.x > 60) vai(base - passo);
                }}
                style={{ pointerEvents: "none" }}
              >
                <button
                  aria-label={it.album.indietro}
                  className="pointer-events-auto absolute inset-y-0 left-0 w-[4%] cursor-w-resize"
                  onClick={() => vai(base - passo)}
                  tabIndex={-1}
                />
                <button
                  aria-label={it.album.avanti}
                  className="pointer-events-auto absolute inset-y-0 right-0 w-[4%] cursor-e-resize"
                  onClick={() => vai(base + passo)}
                  tabIndex={-1}
                />
              </motion.div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pr-1 sm:gap-4">
          <button
            className="btn"
            disabled={base <= 0 || !!giro}
            onClick={() => vai(base - passo)}
            data-testid="pagina-indietro"
          >
            <Icon name="arrowleft" /> {it.album.indietro}
          </button>
          <span
            className="min-w-0 flex-1 text-center text-sm font-bold tabular-nums muted sm:min-w-36 sm:flex-none"
            data-testid="pagina-n"
          >
            {etichetta}
          </span>
          <button
            className="btn btn-primary"
            disabled={base >= ultimo || !!giro}
            onClick={() => vai(base + passo)}
            data-testid="pagina-avanti"
          >
            {it.album.avanti} <Icon name="arrowright" />
          </button>
        </div>
        <p className="text-center text-xs muted">{it.album.sfogliaAiuto}</p>
      </div>
    </section>
  );
}

function PaginaView({
  p,
  capitoli,
  carte,
  inMazzo,
  onCarta,
  onDettaglio,
  lato,
}: {
  p: Pagina;
  capitoli: { anime: string; lista: AlbumCarta[]; possedute: number }[];
  carte: AlbumCarta[];
  inMazzo: Set<string>;
  onCarta: (c: AlbumCarta) => void;
  onDettaglio: (c: AlbumCarta) => void;
  lato: "sx" | "dx";
}) {
  const ombra =
    lato === "sx"
      ? "linear-gradient(90deg, transparent 90%, rgb(0 0 0 / 0.28))"
      : "linear-gradient(270deg, transparent 90%, rgb(0 0 0 / 0.28))";
  return (
    <div
      className={`@container relative aspect-[1/1.5] overflow-hidden ${
        p.tipo === "copertina" ? "text-carta" : "su-carta text-nero"
      }`}
      style={{
        background:
          p.tipo === "copertina"
            ? "#121115"
            : "radial-gradient(rgb(14 13 16 / 0.13) 1px, transparent 1.4px) 0 0 / 9px 9px, #f3ecdd",
        borderRadius: lato === "sx" ? "5px 0 0 5px" : "0 5px 5px 0",
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: ombra }}
      />
      <div className="relative flex h-full flex-col p-[4.5cqw]">
        {p.tipo === "anime" && (
          <>
            <header className="mb-[2.6cqw] flex items-end justify-between gap-2 border-b-[0.5cqw] border-black pb-[1.2cqw]">
              <div className="min-w-0">
                <span className="block text-[2.2cqw] font-black uppercase tracking-[0.25em]">
                  <i
                    className="mr-[1cqw] inline-block size-[1.8cqw] rotate-45 border border-black"
                    style={{ background: paletteFor(p.anime).from }}
                  />
                  {it.album.capitolo}
                </span>
                <h3 className="truncate text-[7cqw] italic leading-none">
                  {paletteFor(p.anime).label !== "Anime" ? paletteFor(p.anime).label : p.anime}
                </h3>
              </div>
              <span className="num shrink-0 text-[2.6cqw]">
                {p.pag}/{p.tot}
              </span>
            </header>
            <ul className="grid flex-1 grid-cols-3 content-start gap-[2.4cqw]">
              {p.carte.map(({ c, n }) => (
                <AlbumSlot
                  key={c.carta.id}
                  c={c}
                  n={n}
                  inMazzo={inMazzo.has(c.carta.id)}
                  onClick={() => onCarta(c)}
                  onDettaglio={() => onDettaglio(c)}
                />
              ))}
            </ul>
          </>
        )}
        {p.tipo === "copertina" && <Copertina capitoli={capitoli} carte={carte} />}
        {p.tipo === "fine" && (
          <div className="grid flex-1 place-items-center text-center">
            <div className="space-y-[2cqw]">
              <p className="display text-[8cqw] italic leading-none">{it.album.fine}</p>
              <p className="mx-auto max-w-[60cqw] text-[3cqw] font-bold muted">
                {it.album.fineTesto}
              </p>
              <Link href="/negozio" className="btn btn-primary mt-[2cqw] text-[3cqw]">
                {it.negozio.titolo}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Copertina({
  capitoli,
  carte,
}: {
  capitoli: { anime: string; lista: AlbumCarta[]; possedute: number }[];
  carte: AlbumCarta[];
}) {
  const possedute = carte.filter((c) => c.posseduta).length;
  const pct = carte.length ? possedute / carte.length : 0;
  const R = 62;
  const circ = 2 * Math.PI * R;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[4cqw] text-center">
      <div>
        <p className="eyebrow justify-center text-[2.4cqw]">{it.album.copertina}</p>
        <h3 className="text-grad text-[15cqw] italic leading-[0.85]">{APP_NAME}</h3>
      </div>
      <div className="relative w-[44cqw]">
        <svg viewBox="0 0 160 160" className="w-full -rotate-90" aria-hidden="true">
          <circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke="rgb(243 236 221 / 0.14)"
            strokeWidth="12"
          />
          <circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke="#e0301f"
            strokeWidth="12"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <div className="num text-[8.5cqw] leading-none">{Math.round(pct * 100)}%</div>
            <div className="text-[2.6cqw] muted">
              {fmt(it.album.completamento, { n: possedute, tot: carte.length })}
            </div>
          </div>
        </div>
      </div>
      <ul className="grid w-[70cqw] grid-cols-2 gap-x-[4cqw] gap-y-[1.2cqw] text-left text-[2.8cqw]">
        {(["comune", "rara", "epica", "leggendaria"] as const).map((r) => {
          const tot = carte.filter((c) => c.rarita === r);
          return (
            <li key={r} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-[1.2cqw]">
                <i
                  className="inline-block size-[2.2cqw] rotate-45"
                  style={{ background: COL_RARITA[r] }}
                />
                {NOMI_RARITA[r]}
              </span>
              <b className="tabular-nums">
                {tot.filter((c) => c.posseduta).length}/{tot.length}
              </b>
            </li>
          );
        })}
      </ul>
      <p className="text-[2.6cqw] muted">
        {capitoli.length} {it.album.capitoli}
      </p>
    </div>
  );
}
