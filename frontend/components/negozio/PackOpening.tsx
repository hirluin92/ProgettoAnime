"use client";

import Icon from "@/components/Icon";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";
import { fmt } from "@/components/duello/DuelloBoard";
import DuelloCard from "@/components/duello/DuelloCard";
import PackArt, { H, STRAPPO, TEMI_PACCHETTO } from "@/components/negozio/PackArt";
import { SHOW_IMAGES } from "@/lib/api";
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

interface Props {
  apertura: AperturaOut;
  nome: string;
  onChiudi: () => void;
}

type Fase = "chiuso" | "aperto" | "riepilogo";

export default function PackOpening({ apertura, nome, onChiudi }: Props) {
  const [fase, setFase] = useState<Fase>("chiuso");
  const [taglio, setTaglio] = useState(0); // 0..1 lungo la linea
  const [indice, setIndice] = useState(0);
  const [girata, setGirata] = useState(false);
  const trascina = useRef(false);
  const taglioRef = useRef(0);
  const banda = useRef<HTMLDivElement>(null);
  const tema = TEMI_PACCHETTO[apertura.tipo] ?? TEMI_PACCHETTO.base;
  const carte = apertura.carte;
  const corrente = carte[indice];

  const apriBusta = () => {
    taglioRef.current = 1;
    setTaglio(1);
    trascina.current = false;
    setFase("aperto");
    setIndice(0);
    setGirata(false);
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

  const avanti = () => {
    if (!girata) {
      setGirata(true);
      return;
    }
    if (indice + 1 >= carte.length) setFase("riepilogo");
    else {
      setIndice(indice + 1);
      setGirata(false);
    }
  };

  const tutte = fase === "riepilogo";
  const stratoStrappo = (STRAPPO / H) * 100;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(ellipse_at_50%_40%,#1b1240,#05040c_70%)] p-4"
      data-testid="apertura"
    >
      <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-4 py-6 text-center">
        <h2 className="display text-3xl font-black sm:text-4xl" style={{ color: tema.accento }}>
          {nome}
        </h2>
        {apertura.garanzia_pity && fase !== "chiuso" && (
          <p className="font-bold text-amber-300">{it.negozio.garanziaPity}</p>
        )}

        {fase === "chiuso" && (
          <>
            <p className="text-sm muted">{it.negozio.taglia}</p>
            <div
              className="relative w-[min(78vw,380px,56vh)] select-none"
              style={{ aspectRatio: "240 / 340" }}
            >
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: [0, -1.2, 1.2, 0] }}
                transition={{ duration: 3.2, repeat: Infinity }}
              >
                <PackArt tipo={apertura.tipo} nome={nome} className="size-full" />
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
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl drop-shadow-[0_2px_6px_rgb(0_0_0/0.8)]"
                  style={{ left: `calc(1.5rem + (100% - 3rem) * ${taglio})` }}
                  aria-hidden="true"
                >
                  <Icon name="scissors" className="size-9 text-white" />
                </span>
              </div>
            </div>
            <p className="text-xs muted">{it.negozio.tagliaAiuto}</p>
          </>
        )}

        {fase === "aperto" && corrente && (
          <>
            <div
              className="relative grid w-[min(80vw,340px,41vh)] place-items-center"
              style={{ aspectRatio: "5 / 7.6" }}
            >
              {/* busta strappata */}
              <motion.div
                className="absolute inset-x-[-8%] bottom-[-26%] z-0"
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: 140, opacity: 0.0 }}
                transition={{ delay: 0.9, duration: 0.8 }}
              >
                <PackArt tipo={apertura.tipo} nome={nome} parte="corpo" className="w-full" />
              </motion.div>
              <motion.div
                className="absolute left-1/2 top-[-34%] z-0 w-[84%] -translate-x-1/2"
                initial={{ y: 0, rotate: 0, opacity: 1 }}
                animate={{ y: -180, x: 120, rotate: 28, opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              >
                <PackArt tipo={apertura.tipo} nome={nome} parte="cima" className="w-full" />
              </motion.div>
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 z-0 rounded-full"
                style={{ background: `radial-gradient(circle, ${tema.accento}, transparent 65%)` }}
                initial={{ opacity: 0.9, scale: 0.4 }}
                animate={{ opacity: 0, scale: 2.4 }}
                transition={{ duration: 1 }}
              />
              <AnimatePresence mode="wait">
                <motion.button
                  key={indice}
                  type="button"
                  className="relative z-10 block w-full cursor-pointer [perspective:900px]"
                  initial={{ y: 320, scale: 0.55, opacity: 0, rotate: 6 }}
                  animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ x: -420, rotate: -16, opacity: 0, transition: { duration: 0.4 } }}
                  transition={{
                    type: "spring",
                    stiffness: 140,
                    damping: 16,
                    delay: indice === 0 ? 0.55 : 0,
                  }}
                  onClick={avanti}
                  data-testid="carta-corrente"
                  aria-label={girata ? corrente.carta.nome : it.negozio.cartaCoperta}
                >
                  <motion.div
                    animate={{ rotateY: girata ? 0 : 180 }}
                    transition={{ duration: 0.55 }}
                    style={{ transformStyle: "preserve-3d" }}
                    className="relative"
                  >
                    <div style={{ backfaceVisibility: "hidden" }}>
                      <div
                        className="rounded-2xl"
                        style={{
                          boxShadow: girata
                            ? `0 0 60px 10px ${GLOW[corrente.rarita] ?? GLOW.comune}`
                            : undefined,
                        }}
                      >
                        <DuelloCard carta={corrente.carta} />
                      </div>
                    </div>
                    <div
                      className="absolute inset-0 grid place-items-center overflow-hidden rounded-2xl border-2 border-white/40"
                      style={{
                        transform: "rotateY(180deg)",
                        backfaceVisibility: "hidden",
                        background: `radial-gradient(circle at 50% 38%, ${tema.a}, ${tema.b} 72%)`,
                        boxShadow:
                          "inset 0 0 0 6px rgb(0 0 0 / 0.25), inset 0 0 0 8px rgb(255 255 255 / 0.35)",
                      }}
                    >
                      <span className="display grid size-20 place-items-center rounded-full border-2 border-white/70 bg-black/50 text-4xl font-black text-white">
                        <Icon name="bolt" className="size-10" />
                      </span>
                    </div>
                  </motion.div>
                </motion.button>
              </AnimatePresence>
            </div>
            <div className="h-12 text-sm font-bold" aria-live="polite">
              {girata && (
                <>
                  <span style={{ color: GLOW[corrente.rarita] }} className="display text-xl">
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
            <div className="flex items-center gap-2">
              <button className="btn btn-primary" onClick={avanti} data-testid="avanti">
                {!girata
                  ? it.negozio.scopri
                  : indice + 1 >= carte.length
                    ? it.negozio.fine
                    : it.negozio.prossima}
              </button>
              <button
                className="btn"
                onClick={() => setFase("riepilogo")}
                data-testid="scopri-tutte"
              >
                {it.negozio.scopriTutte}
              </button>
            </div>
            <p className="text-xs muted">
              {indice + 1} / {carte.length}
            </p>
            <ul className="flex gap-1.5" aria-hidden="true">
              {carte.slice(0, indice).map((c, i) => (
                <li
                  key={i}
                  className="size-10 overflow-hidden rounded-md border-2"
                  style={{ borderColor: GLOW[c.rarita] }}
                >
                  {SHOW_IMAGES && c.carta.immagine_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.carta.immagine_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="size-full object-cover object-top"
                    />
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {tutte && (
          <>
            <ul className="grid w-full grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {carte.map((c, i) => (
                <motion.li
                  key={i}
                  className="w-full max-w-[220px]"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.12 }}
                  data-testid="carta-pacchetto"
                >
                  <div
                    className="rounded-2xl"
                    style={{ boxShadow: `0 0 28px ${GLOW[c.rarita]}88` }}
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
            <div className="space-y-3" data-testid="riepilogo-apertura">
              <p>
                {fmt(it.negozio.riepilogo, {
                  n: carte.filter((c) => c.nuova).length,
                  m: apertura.rimborsati,
                })}
              </p>
              <div className="flex justify-center gap-2">
                <button className="btn btn-primary" onClick={onChiudi}>
                  {it.negozio.chiudi}
                </button>
                <Link href="/album" className="btn">
                  {it.negozio.vaiAlbum}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
