"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { fmt } from "@/components/duello/DuelloBoard";
import DuelloCard from "@/components/duello/DuelloCard";
import Icon from "@/components/Icon";
import PackArt, { H, STRAPPO, TEMI_PACCHETTO } from "@/components/negozio/PackArt";
import it from "@/i18n/it.json";
import type { AperturaOut } from "@/lib/negozio";

const GLOW: Record<string, string> = {
  comune: "#9aa7c7",
  rara: "#4aa8ff",
  epica: "#b36bff",
  leggendaria: "#ffc23d",
};
const NOMI_RARITA = it.album.rarita as Record<string, string>;
const SOGLIA = 0.9; // quanta linea va percorsa per strappare la busta

// Carosello 3D: spostamento (in % della larghezza carta), scala e inclinazione per distanza dal centro.
const X = [0, 66, 116, 152, 176, 192];
const SCALA = [1, 0.86, 0.72, 0.6, 0.5, 0.42];
const lim = (n: number) => Math.min(Math.abs(n), X.length - 1);

interface Props {
  apertura: AperturaOut;
  nome: string;
  onChiudi: () => void;
}

type Fase = "chiuso" | "carosello";

export default function PackOpening({ apertura, nome, onChiudi }: Props) {
  const [fase, setFase] = useState<Fase>("chiuso");
  const [taglio, setTaglio] = useState(0); // 0..1 lungo la linea
  const [indice, setIndice] = useState(0);
  const [rivelate, setRivelate] = useState<number[]>([]);
  const [riepilogo, setRiepilogo] = useState(false);
  const trascina = useRef(false);
  const taglioRef = useRef(0);
  const banda = useRef<HTMLDivElement>(null);
  const bloccoRuota = useRef(0);
  const tema = TEMI_PACCHETTO[apertura.tipo] ?? TEMI_PACCHETTO.base;
  const carte = apertura.carte;
  const n = carte.length;
  const corrente = carte[indice];
  const girata = rivelate.includes(indice);

  const apriBusta = () => {
    taglioRef.current = 1;
    setTaglio(1);
    trascina.current = false;
    setFase("carosello");
  };

  const muovi = (clientX: number) => {
    const r = banda.current?.getBoundingClientRect();
    if (!r || !trascina.current) return;
    const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    // si parte dal lato sinistro (pointerdown) e si può solo avanzare
    const nuovo = Math.max(taglioRef.current, p);
    taglioRef.current = nuovo;
    if (nuovo >= SOGLIA) apriBusta();
    else setTaglio(nuovo);
  };

  // la carta al centro si gira da sola dopo un attimo
  useEffect(() => {
    if (fase !== "carosello") return;
    const t = setTimeout(
      () => setRivelate((r) => (r.includes(indice) ? r : [...r, indice])),
      indice === 0 ? 1500 : 450,
    );
    return () => clearTimeout(t);
  }, [fase, indice]);

  const vai = useCallback(
    (nuovo: number) => setIndice((i) => Math.min(n - 1, Math.max(0, nuovo === i ? i : nuovo))),
    [n],
  );
  const avanti = () => {
    if (indice + 1 >= n) setRiepilogo(true);
    else vai(indice + 1);
  };

  useEffect(() => {
    if (fase !== "carosello" || riepilogo) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndice((i) => Math.min(n - 1, i + 1));
      else if (e.key === "ArrowLeft") setIndice((i) => Math.max(0, i - 1));
      else if (e.key === "Enter" && indice === n - 1) setRiepilogo(true);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [fase, riepilogo, n, indice]);

  const stratoStrappo = (STRAPPO / H) * 100;
  const rara = corrente && (corrente.rarita === "epica" || corrente.rarita === "leggendaria");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-hidden bg-[#05040c]"
      data-testid="apertura"
    >
      {/* alone del colore del pacchetto */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 45%, ${tema.a}40, transparent 62%)`,
        }}
      />
      <button
        className="absolute right-4 top-4 z-30 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-white/15"
        onClick={() => {
          setFase("carosello");
          setRivelate(carte.map((_, i) => i));
          setRiepilogo(true);
        }}
        data-testid="scopri-tutte"
      >
        {it.negozio.salta}
      </button>

      <div className="relative mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-3 px-4 py-6 text-center">
        {fase === "chiuso" && (
          <>
            <h2 className="display text-3xl font-black sm:text-4xl" style={{ color: tema.accento }}>
              {nome}
            </h2>
            <div
              className="relative w-[min(72vw,360px,46vh)] select-none"
              style={{ aspectRatio: "240 / 420" }}
            >
              <motion.div
                className="absolute inset-0"
                initial={{ y: 40, opacity: 0, scale: 0.9 }}
                animate={{ y: [0, -8, 0], rotate: [0, -1.4, 1.4, 0], opacity: 1, scale: 1 }}
                transition={{
                  y: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 4.6, repeat: Infinity, ease: "easeInOut" },
                  default: { duration: 0.6 },
                }}
              >
                <PackArt tipo={apertura.tipo} nome={nome} carte={n} className="size-full" />
              </motion.div>
              {/* linea di strappo: tratteggiata, poi luminosa dove hai già tagliato */}
              <div
                ref={banda}
                role="slider"
                tabIndex={0}
                aria-label={it.negozio.tagliaEtichetta}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(taglio * 100)}
                data-testid="taglio"
                className="absolute -left-6 -right-6 z-10 cursor-grab touch-none active:cursor-grabbing"
                style={{ top: `${stratoStrappo}%`, height: 56, transform: "translateY(-50%)" }}
                onPointerDown={(e) => {
                  const r = banda.current?.getBoundingClientRect();
                  if (!r) return;
                  const p = (e.clientX - r.left) / r.width;
                  if (p > 0.3) return; // si comincia a tagliare dal lato sinistro
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  trascina.current = true;
                  taglioRef.current = Math.max(taglioRef.current, Math.max(0, p));
                  setTaglio(taglioRef.current);
                }}
                onPointerMove={(e) => muovi(e.clientX)}
                onPointerUp={() => (trascina.current = false)}
                onPointerCancel={() => (trascina.current = false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
                    e.preventDefault();
                    apriBusta();
                  }
                }}
              >
                <div
                  className="absolute inset-x-6 top-1/2 -translate-y-1/2"
                  style={{
                    borderTop: "3px dashed rgb(15 23 42 / 0.8)",
                    boxShadow: "0 1px 0 rgb(255 255 255 / 0.9)",
                  }}
                />
                <div
                  className="absolute left-6 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_14px_4px_rgb(255_200_60/0.9)]"
                  style={{ width: `calc((100% - 3rem) * ${taglio})` }}
                />
                <span
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_6px_rgb(0_0_0/0.8)]"
                  style={{ left: `calc(1.5rem + (100% - 3rem) * ${taglio})` }}
                  aria-hidden="true"
                >
                  <Icon name="scissors" className="size-9 text-white" />
                </span>
              </div>
            </div>
            <p className="max-w-md text-sm font-bold uppercase tracking-wider text-white/80">
              {it.negozio.taglia}
            </p>
            <p className="text-xs muted">{it.negozio.tagliaAiuto}</p>
          </>
        )}

        {fase === "carosello" && (
          <>
            <p className="display text-sm tracking-[0.3em] text-white/70" aria-live="polite">
              {fmt(it.negozio.cartaN, { n: indice + 1, tot: n })}
            </p>
            <motion.div
              className="relative w-full touch-pan-y select-none"
              style={{ height: "min(62vh, 560px)", perspective: 1600 }}
              onPanEnd={(_, info) => {
                if (info.offset.x < -50) setIndice((i) => Math.min(n - 1, i + 1));
                else if (info.offset.x > 50) setIndice((i) => Math.max(0, i - 1));
              }}
              onWheel={(e) => {
                const ora = Date.now();
                if (ora < bloccoRuota.current) return;
                const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                if (Math.abs(d) < 12) return;
                bloccoRuota.current = ora + 350;
                setIndice((i) => Math.min(n - 1, Math.max(0, i + (d > 0 ? 1 : -1))));
              }}
              data-testid="carosello"
            >
              {/* busta strappata che esce di scena */}
              <motion.div
                className="pointer-events-none absolute left-1/2 top-[8%] z-0 w-[min(46vw,300px,32vh)] -translate-x-1/2"
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: 520, opacity: 0 }}
                transition={{ delay: 0.5, duration: 0.9, ease: "easeIn" }}
              >
                <PackArt tipo={apertura.tipo} nome={nome} parte="corpo" className="w-full" />
              </motion.div>
              <motion.div
                className="pointer-events-none absolute left-1/2 top-[-4%] z-0 w-[min(46vw,300px,32vh)] -translate-x-1/2"
                initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
                animate={{ y: -260, x: 220, rotate: 34, opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              >
                <PackArt tipo={apertura.tipo} nome={nome} parte="cima" className="w-full" />
              </motion.div>

              {carte.map((c, i) => {
                const d = i - indice;
                const k = lim(d);
                const segno = Math.sign(d);
                const aperta = rivelate.includes(i);
                const attiva = d === 0;
                const colore = GLOW[c.rarita] ?? GLOW.comune;
                return (
                  <motion.div
                    key={i}
                    className="absolute left-1/2 top-[3%] w-[min(56vw,330px,38vh)]"
                    style={{ marginLeft: "calc(min(56vw, 330px, 38vh) / -2)", zIndex: 50 - k }}
                    initial={{ y: 420, x: "0%", scale: 0.5, opacity: 0, rotateY: 0 }}
                    animate={{
                      y: 0,
                      x: `${segno * X[k]}%`,
                      scale: SCALA[k],
                      rotateY: attiva ? 0 : -segno * 14,
                      opacity: Math.abs(d) > 5 ? 0 : 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 130,
                      damping: 18,
                      delay: fase === "carosello" && indice === 0 ? 0.35 + i * 0.07 : 0,
                    }}
                    onClick={() => !attiva && vai(i)}
                    data-testid={attiva ? "carta-corrente" : undefined}
                  >
                    <motion.div
                      className="relative"
                      animate={{ rotateY: aperta ? 0 : 180 }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <div style={{ backfaceVisibility: "hidden" }}>
                        <div
                          className="rounded-2xl"
                          style={{
                            boxShadow:
                              aperta && attiva
                                ? `0 0 70px 8px ${colore}`
                                : "0 18px 40px rgb(0 0 0 / 0.6)",
                          }}
                        >
                          <DuelloCard carta={c.carta} />
                        </div>
                        {aperta && (
                          <span
                            className={`absolute -right-2 top-16 z-10 rotate-6 rounded-md px-2 py-0.5 text-xs font-black uppercase shadow-lg ${
                              c.nuova ? "bg-amber-300 text-black" : "bg-white/90 text-black"
                            }`}
                          >
                            {c.nuova ? it.negozio.nuova : it.negozio.doppioneBreve}
                          </span>
                        )}
                      </div>
                      {/* dorso */}
                      <div
                        className="absolute inset-0 grid place-items-center overflow-hidden rounded-2xl border-[3px] border-white/70"
                        style={{
                          transform: "rotateY(180deg)",
                          backfaceVisibility: "hidden",
                          background: `radial-gradient(circle at 50% 38%, ${tema.a}, ${tema.b} 78%)`,
                          boxShadow: "0 18px 40px rgb(0 0 0 / 0.6)",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 opacity-30"
                          style={{
                            backgroundImage:
                              "radial-gradient(circle, #fff 1.2px, transparent 1.6px)",
                            backgroundSize: "14px 14px",
                          }}
                        />
                        <span className="relative grid aspect-square w-[58%] place-items-center rounded-full border-4 border-white/80 bg-black/55 text-center shadow-[0_0_30px_rgb(0_0_0/0.5)]">
                          <span>
                            <Icon name="bolt" className="size-[2.4rem] text-white" />
                            <span className="display block text-xl font-black leading-none">
                              ARENA
                              <br />
                              ANIME
                            </span>
                          </span>
                        </span>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
              {girata && rara && (
                <motion.span
                  key={`flash${indice}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-[40%] z-[60] size-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${GLOW[corrente.rarita]}aa, transparent 65%)`,
                  }}
                  initial={{ opacity: 0.9, scale: 0.3 }}
                  animate={{ opacity: 0, scale: 1.6 }}
                  transition={{ duration: 0.9 }}
                />
              )}
            </motion.div>

            <div className="h-8 text-sm font-bold" aria-live="polite">
              {girata && (
                <>
                  <span style={{ color: GLOW[corrente.rarita] }} className="display text-2xl">
                    {NOMI_RARITA[corrente.rarita]}
                  </span>{" "}
                  {corrente.nuova ? (
                    <span className="text-emerald-300">{it.negozio.nuova}</span>
                  ) : (
                    <span className="text-amber-200">
                      {fmt(it.negozio.doppione, { n: corrente.rimborso })}
                    </span>
                  )}
                </>
              )}
            </div>
            {/* avanzamento: i bollini delle carte rare si accendono */}
            <ul className="flex gap-2" aria-hidden="true">
              {carte.map((c, i) => {
                const speciale = c.rarita === "epica" || c.rarita === "leggendaria";
                return (
                  <li
                    key={i}
                    className="size-2.5 rounded-full transition-all"
                    style={{
                      background:
                        i === indice
                          ? "#fff"
                          : speciale && i < indice
                            ? GLOW[c.rarita]
                            : "rgb(255 255 255 / 0.22)",
                      transform: i === indice ? "scale(1.5)" : undefined,
                      boxShadow: speciale && i <= indice ? `0 0 8px ${GLOW[c.rarita]}` : undefined,
                    }}
                  />
                );
              })}
            </ul>
            <div className="flex items-center gap-2">
              <button className="btn btn-primary" onClick={avanti} data-testid="avanti">
                {indice + 1 >= n ? it.negozio.fine : it.negozio.prossima}
              </button>
            </div>
            <p className="text-xs muted">{it.negozio.scorri}</p>
          </>
        )}
      </div>

      {riepilogo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-black/80 p-4"
        >
          <div className="panel w-full max-w-4xl space-y-4 p-5 text-center sm:p-7">
            <p className="eyebrow justify-center">{nome}</p>
            <h3 className="display text-3xl font-black" data-testid="riepilogo-apertura">
              {fmt(it.negozio.riepilogo, {
                n: carte.filter((c) => c.nuova).length,
                m: apertura.rimborsati,
              })}
            </h3>
            <ul className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {carte.map((c, i) => (
                <motion.li
                  key={i}
                  className="w-full max-w-[200px]"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  data-testid="carta-pacchetto"
                >
                  <div
                    className="rounded-2xl"
                    style={{ boxShadow: `0 0 24px ${GLOW[c.rarita]}88` }}
                  >
                    <DuelloCard carta={c.carta} />
                  </div>
                  <p className="mt-1 text-xs font-bold">
                    {c.nuova ? (
                      <span className="text-emerald-300">{it.negozio.nuova}</span>
                    ) : (
                      <span className="text-amber-200">
                        {fmt(it.negozio.doppione, { n: c.rimborso })}
                      </span>
                    )}
                  </p>
                </motion.li>
              ))}
            </ul>
            <div className="flex justify-center gap-2">
              <button className="btn btn-primary" onClick={onChiudi}>
                {it.negozio.chiudi}
              </button>
              <Link href="/album" className="btn">
                {it.negozio.vaiAlbum}
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
