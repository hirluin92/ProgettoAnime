"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import it from "@/i18n/it.json";
import { SECONDI_SIGLA } from "@/lib/quiz";

// Lettore dell'anteprima di una sigla: si ascolta solo l'inizio, che si allunga a ogni errore.
// L'audio è l'anteprima di 30 secondi ospitata da Apple: non viene copiata né scaricata.

const mmss = (t: number) => `0:${String(Math.floor(t)).padStart(2, "0")}`;

export default function Ascolto({
  src,
  livello,
  intero,
  autoplay,
  tetto,
  loopIniziale,
  progressivo = true,
}: {
  src: string;
  livello: number; // 0..5: errori fatti (o livello del quiz)
  intero?: boolean; // a risposta data si ascolta tutta
  autoplay?: boolean;
  tetto?: number; // durata massima dell'anteprima (impostazione della partita)
  loopIniziale?: boolean; // se definito, compare il pulsante per ripetere in loop
  progressivo?: boolean; // false: suona intera dall'inizio, una volta sola (di default nelle stanze)
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [suona, setSuona] = useState(false);
  const [tempo, setTempo] = useState(0); // secondi ascoltati, per la barra che scorre
  const [errore, setErrore] = useState(false);
  const [loop, setLoop] = useState(!!loopIniziale);
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const secondi = intero
    ? 30
    : progressivo
      ? Math.min(tetto ?? 30, SECONDI_SIGLA[Math.min(livello, SECONDI_SIGLA.length - 1)])
      : (tetto ?? 30);

  const ferma = () => {
    window.clearTimeout(timer.current);
    ref.current?.pause();
    setSuona(false);
    setTempo(0);
  };
  const avvia = () => {
    const a = ref.current;
    if (!a) return;
    window.clearTimeout(timer.current);
    a.currentTime = 0;
    setTempo(0);
    a.play()
      .then(() => {
        setSuona(true);
        setErrore(false);
        // a fine anteprima: si ripete se il loop è attivo, altrimenti si ferma
        timer.current = window.setTimeout(() => {
          if (loopRef.current && !intero) avvia();
          else ferma();
        }, secondi * 1000);
      })
      .catch(() => setErrore(true));
  };

  // mentre suona, la barra segue la posizione dell'audio
  useEffect(() => {
    if (!suona) return;
    let id = 0;
    const giro = () => {
      setTempo(ref.current?.currentTime ?? 0);
      id = requestAnimationFrame(giro);
    };
    id = requestAnimationFrame(giro);
    return () => cancelAnimationFrame(id);
  }, [suona]);

  // progressiva: a ogni livello (nuovo errore o tempo che passa) si riascolta dall'inizio;
  // intera: parte una volta sola all'inizio della domanda
  useEffect(() => {
    if (autoplay) avvia();
    return ferma;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressivo ? livello : 0, src, autoplay]);

  return (
    <div className="panel space-y-3 p-5 text-center" data-testid="ascolto">
      <audio
        ref={ref}
        src={src}
        preload="auto"
        onEnded={() => (loopRef.current && !intero ? avvia() : ferma())}
      />
      <button
        type="button"
        onClick={suona ? ferma : avvia}
        className="btn btn-primary mx-auto size-24 !rounded-full"
        aria-label={suona ? it.quiz.sigla.ferma : it.quiz.sigla.ascolta}
        data-testid="ascolto-play"
      >
        <Icon
          name={suona ? "pause" : "play"}
          className={`size-11 ${suona ? "" : "translate-x-0.5"}`}
        />
      </button>
      <p className="text-sm font-bold">
        {intero
          ? it.quiz.sigla.tutta
          : (progressivo
              ? it.quiz.sigla.secondi
              : loop
                ? it.quiz.sigla.interaLoop
                : it.quiz.sigla.intera
            ).replace("{n}", String(secondi))}
      </p>
      {/* la barra: i segmenti sbloccati si riempiono mentre l'audio scorre, come in un lettore */}
      <div className="mx-auto max-w-md space-y-1">
        <ul
          className="flex gap-1"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={secondi}
          aria-valuenow={Math.round(tempo)}
          data-testid="ascolto-barra"
        >
          {(progressivo ? SECONDI_SIGLA : [secondi]).map((s, i) => {
            const da = !progressivo || i === 0 ? 0 : SECONDI_SIGLA[i - 1];
            const aperto = intero || !progressivo || i <= livello;
            const riempi = Math.max(0, Math.min(1, (tempo - da) / (s - da)));
            return (
              <li
                key={s}
                className={`relative h-2.5 flex-1 overflow-hidden rounded-full ${
                  aperto ? "bg-white/25" : "bg-white/10"
                }`}
                style={{ flexGrow: !progressivo ? 1 : s === 1 ? 1 : Math.log2(s) + 1 }}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-300 to-pink-500"
                  style={{ width: `${riempi * 100}%` }}
                />
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between text-[0.7rem] tabular-nums muted">
          <span>{mmss(tempo)}</span>
          <span>{mmss(secondi)}</span>
        </div>
      </div>
      {loopIniziale !== undefined && !intero && (
        <button
          type="button"
          aria-pressed={loop}
          onClick={() => setLoop((l) => !l)}
          className={`chip mx-auto cursor-pointer px-3 py-1 ${loop ? "text-cyan-200" : "muted"}`}
          data-testid="ascolto-loop"
        >
          {loop ? it.quiz.sigla.loopOn : it.quiz.sigla.loopOff}
        </button>
      )}
      {errore && <p className="text-sm text-amber-200">{it.quiz.sigla.noAudio}</p>}
      <p className="text-[0.7rem] muted">{it.quiz.sigla.credito}</p>
    </div>
  );
}
