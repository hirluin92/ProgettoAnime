"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import it from "@/i18n/it.json";
import { SECONDI_SIGLA } from "@/lib/quiz";

// Lettore dell'anteprima di una sigla: si ascolta solo l'inizio, che si allunga a ogni errore.
// L'audio è l'anteprima di 30 secondi ospitata da Apple: non viene copiata né scaricata.

export default function Ascolto({
  src,
  livello,
  intero,
  autoplay,
}: {
  src: string;
  livello: number; // 0..5: errori fatti (o livello del quiz)
  intero?: boolean; // a risposta data si ascolta tutta
  autoplay?: boolean;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [suona, setSuona] = useState(false);
  const [errore, setErrore] = useState(false);
  const secondi = intero ? 30 : SECONDI_SIGLA[Math.min(livello, SECONDI_SIGLA.length - 1)];

  const ferma = () => {
    window.clearTimeout(timer.current);
    ref.current?.pause();
    setSuona(false);
  };
  const avvia = () => {
    const a = ref.current;
    if (!a) return;
    window.clearTimeout(timer.current);
    a.currentTime = 0;
    a.play()
      .then(() => {
        setSuona(true);
        setErrore(false);
        timer.current = window.setTimeout(ferma, secondi * 1000);
      })
      .catch(() => setErrore(true));
  };

  // il livello sale (nuovo errore o tempo che passa): si riascolta dall'inizio
  useEffect(() => {
    if (autoplay) avvia();
    return ferma;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livello, src, autoplay]);

  return (
    <div className="panel space-y-3 p-5 text-center" data-testid="ascolto">
      <audio ref={ref} src={src} preload="auto" onEnded={() => setSuona(false)} />
      <button
        type="button"
        onClick={suona ? ferma : avvia}
        className="btn btn-primary mx-auto size-24 !rounded-full text-3xl"
        aria-label={suona ? it.quiz.sigla.ferma : it.quiz.sigla.ascolta}
        data-testid="ascolto-play"
      >
        {suona ? (
          <span className="flex gap-1.5" aria-hidden="true">
            <i className="block h-8 w-2.5 animate-pulse rounded bg-white" />
            <i className="block h-8 w-2.5 animate-pulse rounded bg-white [animation-delay:200ms]" />
            <i className="block h-8 w-2.5 animate-pulse rounded bg-white [animation-delay:400ms]" />
          </span>
        ) : (
          <Icon name="music" className="size-10" />
        )}
      </button>
      <p className="text-sm font-bold">
        {intero ? it.quiz.sigla.tutta : it.quiz.sigla.secondi.replace("{n}", String(secondi))}
      </p>
      {/* i segmenti già sbloccati */}
      <ul className="mx-auto flex max-w-sm gap-1" aria-hidden="true">
        {SECONDI_SIGLA.map((s, i) => (
          <li
            key={s}
            className={`h-2 flex-1 rounded-full ${
              intero || i <= livello ? "bg-gradient-to-r from-cyan-300 to-pink-500" : "bg-white/15"
            }`}
            style={{ flexGrow: s === 1 ? 1 : Math.log2(s) + 1 }}
          />
        ))}
      </ul>
      {errore && <p className="text-sm text-amber-200">{it.quiz.sigla.noAudio}</p>}
      <p className="text-[0.7rem] muted">{it.quiz.sigla.credito}</p>
    </div>
  );
}
