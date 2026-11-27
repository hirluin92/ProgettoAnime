"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { fmt } from "@/components/duello/DuelloBoard";
import { CartaRetro } from "@/components/carta/Carta";
import DuelloCard from "@/components/duello/DuelloCard";
import Icon from "@/components/Icon";
import Bustina3D from "@/components/negozio/Bustina3D";
import PackArt, { H, STRAPPO, TEMI_PACCHETTO } from "@/components/negozio/PackArt";
import it from "@/i18n/it.json";
import type { AperturaOut } from "@/lib/negozio";

const GLOW: Record<string, string> = {
  comune: "#b3b0ba",
  rara: "#58d6f5",
  epica: "#ff7cc4",
  leggendaria: "#ffd21f",
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
      className="esplosione fixed inset-0 z-50 overflow-hidden"
      style={{ ["--tinta" as string]: tema.accento }}
      data-testid="apertura"
    >
      {/* alone del colore del pacchetto */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 42%, #0b0a0d 0 30%, transparent 70%)",
        }}
      />
      <button
        className="btn absolute right-3 top-3 z-30 min-h-11 px-4 text-sm"
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
            <h2 className="text-grad text-4xl sm:text-5xl">{nome}</h2>
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
                <Bustina3D tipo={apertura.tipo} nome={nome} carte={n} ferma />
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
                    borderTop: "3px dashed #0e0d10",
                    boxShadow: "0 2px 0 rgb(243 236 221 / 0.9)",
                  }}
                />
                <div
                  className="absolute left-6 top-1/2 h-[5px] -translate-y-1/2 bg-[#0e0d10] outline outline-2 outline-[#ffd21f]"
                  style={{ width: `calc((100% - 3rem) * ${taglio})` }}
                />
                <span
                  className="absolute top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-black bg-[#ffd21f] text-black shadow-[3px_3px_0_#000]"
                  style={{ left: `calc(1.5rem + (100% - 3rem) * ${taglio})` }}
                  aria-hidden="true"
                >
                  <Icon name="scissors" className="size-7" />
                </span>
              </div>
            </div>
            <p className="balloon max-w-md text-sm uppercase tracking-wide">{it.negozio.taglia}</p>
            <p className="text-xs muted">{it.negozio.tagliaAiuto}</p>
          </>
        )}

        {fase === "carosello" && (
          <>
            <p className="num text-sm tracking-[0.2em] text-carta" aria-live="polite">
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
                initial={{ y: 0, opacity: 1, rotateX: 0 }}
                animate={{ y: 520, opacity: 0, rotateX: -55 }}
                transition={{ delay: 0.5, duration: 0.9, ease: "easeIn" }}
                style={{ transformPerspective: 900, transformOrigin: "50% 0%" }}
              >
                <PackArt tipo={apertura.tipo} nome={nome} parte="corpo" className="w-full" />
              </motion.div>
              <motion.div
                className="pointer-events-none absolute left-1/2 top-[-4%] z-0 w-[min(46vw,300px,32vh)] -translate-x-1/2"
                initial={{ y: 0, x: 0, rotate: 0, rotateX: 0, rotateY: 0, opacity: 1 }}
                animate={{ y: -260, x: 220, rotate: 34, rotateX: 70, rotateY: -40, opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                style={{ transformPerspective: 900 }}
              >
                <PackArt tipo={apertura.tipo} nome={nome} parte="cima" className="w-full" />
              </motion.div>

              {carte.map((c, i) => {
                const d = i - indice;
                const k = lim(d);
                const segno = Math.sign(d);
                const aperta = rivelate.includes(i);
                const attiva = d === 0;
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
                        <DuelloCard mano tilt carta={c.carta} />
                        {aperta && (
                          <span
                            className={`absolute -right-3 top-[22%] z-10 rotate-6 border-2 border-black px-2 py-0.5 text-xs font-black uppercase shadow-[3px_3px_0_#000] ${
                              c.nuova ? "bg-[#ffd21f] text-black" : "bg-carta text-black"
                            }`}
                          >
                            {c.nuova ? it.negozio.nuova : it.negozio.doppioneBreve}
                          </span>
                        )}
                      </div>
                      {/* dorso */}
                      <div
                        className="absolute inset-0"
                        style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
                      >
                        <CartaRetro className="h-full [&>div]:aspect-auto [&>div]:h-full" />
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
              {girata && rara && (
                <motion.span
                  key={`flash${indice}`}
                  aria-hidden="true"
                  className="cinetiche pointer-events-none absolute left-1/2 top-[40%] z-[60] size-[90vh] -translate-x-1/2 -translate-y-1/2"
                  style={{ ["--tinta" as string]: GLOW[corrente.rarita] }}
                  initial={{ opacity: 1, scale: 0.4, rotate: 0 }}
                  animate={{ opacity: 0, scale: 1.5, rotate: 12 }}
                  transition={{ duration: 0.8 }}
                />
              )}
            </motion.div>

            <div className="flex h-10 items-center gap-3 text-sm font-bold" aria-live="polite">
              {girata && (
                <>
                  <motion.span
                    key={`r${indice}`}
                    initial={{ scale: 2, rotate: -12, opacity: 0 }}
                    animate={{ scale: 1, rotate: -4, opacity: 1 }}
                    transition={{ duration: 0.3, ease: [0.3, 1.6, 0.5, 1] }}
                    style={{ color: GLOW[corrente.rarita] }}
                    className="onoma text-3xl"
                  >
                    {NOMI_RARITA[corrente.rarita]}
                    {rara ? "!" : ""}
                  </motion.span>{" "}
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
                    className="size-3 border-2 border-black transition-transform"
                    style={{
                      background:
                        i === indice
                          ? "#f3ecdd"
                          : speciale && i < indice
                            ? GLOW[c.rarita]
                            : "#4a4850",
                      transform: `rotate(45deg) scale(${i === indice ? 1.4 : 1})`,
                    }}
                  />
                );
              })}
            </ul>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-primary min-h-14 px-8 text-xl"
                onClick={avanti}
                data-testid="avanti"
              >
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
          className="absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-black/85 p-4"
        >
          <div className="panel panel-solido w-full max-w-4xl space-y-4 p-5 text-center sm:p-7">
            <p className="eyebrow justify-center">{nome}</p>
            <h3 className="text-3xl italic sm:text-4xl" data-testid="riepilogo-apertura">
              {fmt(it.negozio.riepilogo, {
                n: carte.filter((c) => c.nuova).length,
                m: apertura.rimborsati,
              })}
            </h3>
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-5">
              {carte.map((c, i) => (
                <motion.li
                  key={i}
                  className="w-[9.5rem] sm:w-44"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  data-testid="carta-pacchetto"
                >
                  <DuelloCard carta={c.carta} />
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
            <div className="flex flex-wrap justify-center gap-3 pb-1">
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
