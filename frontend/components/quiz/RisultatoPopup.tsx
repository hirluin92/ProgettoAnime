"use client";

import Moneta from "@/components/Moneta";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect } from "react";
import { fmt } from "@/components/duello/DuelloBoard";
import Icon from "@/components/Icon";
import it from "@/i18n/it.json";

// Il risultato di una sfida: una finestra sopra la pagina (niente scorrimento per vederlo),
// che si può chiudere; dopo resta una barra in alto da cui riaprirla.

interface Props {
  finito: boolean;
  aperto: boolean;
  onApri: () => void;
  onChiudi: () => void;
  vinto: boolean;
  nome: string;
  dettaglio: string;
  immagine: string;
  crediti: number;
  copiato: boolean;
  onCondividi: () => void;
  libero: boolean;
  onNuova: () => void;
  testId: string; // es. "animedle" → animedle-fine, animedle-crediti, animedle-esito
}

export default function RisultatoPopup(p: Props) {
  useEffect(() => {
    if (!p.finito || !p.aperto) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && p.onChiudi();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [p]);

  if (!p.finito) return null;
  return (
    <>
      {!p.aperto && (
        <button
          type="button"
          onClick={p.onApri}
          data-testid={`${p.testId}-esito`}
          className={`flex w-full items-center justify-between gap-3 border-2 px-4 py-3 text-left font-bold ${
            p.vinto ? "border-[#35d68a] bg-[#35d68a]/10" : "border-rose-400 bg-rose-400/10"
          }`}
        >
          <span>
            <span className={p.vinto ? "text-emerald-300" : "text-rose-300"}>
              {p.vinto ? it.quiz.indovinato : it.quiz.eraQuesto}
            </span>{" "}
            · {p.nome}
          </span>
          <span className="text-sm underline muted">{it.quiz.mostraRisultato}</span>
        </button>
      )}
      <AnimatePresence>
        {p.aperto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/85 p-4"
            onClick={p.onChiudi}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={p.vinto ? it.quiz.indovinato : it.quiz.eraQuesto}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              className="panel panel-solido relative flex w-full max-w-xl flex-wrap items-center gap-5 p-6"
              onClick={(e) => e.stopPropagation()}
              data-testid={`${p.testId}-fine`}
            >
              <button
                type="button"
                onClick={p.onChiudi}
                aria-label={it.quiz.chiudi}
                className="absolute right-2 top-2 grid size-11 place-items-center border-2 border-[var(--line-forte)] bg-[#201f26] hover:border-carta"
                data-testid={`${p.testId}-chiudi`}
              >
                <Icon name="x" className="size-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.immagine}
                alt=""
                referrerPolicy="no-referrer"
                className="h-44 -rotate-2 border-[3px] border-carta shadow-[5px_5px_0_#000]"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <h2
                  className={`text-4xl ${p.vinto ? "onoma -rotate-3 !text-[#35d68a]" : "display italic text-rose-300"}`}
                >
                  {p.vinto ? it.quiz.indovinato : it.quiz.eraQuesto}
                </h2>
                <p className="text-2xl font-black leading-tight">{p.nome}</p>
                <p className="muted">{p.dettaglio}</p>
                {p.vinto && p.crediti > 0 && (
                  <p
                    className="chip border-black bg-[#ffd21f] text-sm text-black"
                    data-testid={`${p.testId}-crediti`}
                  >
                    <Moneta gira className="size-[1.4em]" />{" "}
                    {fmt(it.quiz.guadagnati, { n: p.crediti })}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button className="btn btn-primary" onClick={p.onCondividi}>
                    {p.copiato ? it.quiz.copiato : it.quiz.condividi}
                  </button>
                  {p.libero ? (
                    <button className="btn" onClick={p.onNuova}>
                      {it.quiz.nuova}
                    </button>
                  ) : (
                    <Link href="/sfide" className="btn">
                      {it.quiz.altreSfide}
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
