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
  // il volume si ricorda tra una partita e l'altra
  const [volume, setVolume] = useState(0.8);
  useEffect(() => {
    const v = Number(window.localStorage.getItem("arena.volume"));
    if (v > 0 || window.localStorage.getItem("arena.volume") === "0") setVolume(Math.min(1, v));
  }, []);
  // Il volume passa da un nodo di guadagno (Web Audio): i browser dei telefoni spesso ignorano
  // `audio.volume`. Se non è disponibile (o l'audio non ammette l'accesso) si usa `audio.volume`.
  const [cors, setCors] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const [applicato, setApplicato] = useState("");
  const collega = () => {
    const a = ref.current;
    if (!a || gainRef.current || !cors) return;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = new AC();
      const sorgente = ctx.createMediaElementSource(a);
      const guadagno = ctx.createGain();
      guadagno.gain.value = volumeRef.current;
      sorgente.connect(guadagno);
      guadagno.connect(ctx.destination);
      a.volume = 1; // il volume lo fa il guadagno, non va applicato due volte
      ctxRef.current = ctx;
      gainRef.current = guadagno;
    } catch {
      /* si resta con audio.volume */
    }
  };
  // da chiamare dentro un tocco: collega l'audio al guadagno e riattiva il contesto
  const attivaVolume = () => {
    collega();
    void ctxRef.current?.resume();
  };
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
    else if (ref.current) ref.current.volume = volume;
    setApplicato(String(volume));
    window.localStorage.setItem("arena.volume", String(volume));
  }, [volume]);
  useEffect(
    () => () => {
      void ctxRef.current?.close();
    },
    [],
  );
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
  // `gesto`: chiamata da un tocco dell'utente. Solo lì si attiva il controllo di volume Web Audio:
  // creato senza un tocco, il contesto resta sospeso e l'audio non scorre.
  const avvia = (gesto = false) => {
    const a = ref.current;
    if (!a) return;
    window.clearTimeout(timer.current);
    if (gesto) attivaVolume();
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
    <div
      className="panel space-y-3 p-5 text-center"
      data-testid="ascolto"
      data-volume-applicato={applicato}
    >
      <audio
        key={cors ? "cors" : "senza"}
        ref={ref}
        src={src}
        crossOrigin={cors ? "anonymous" : undefined}
        onError={() => {
          // se l'audio non ammette l'accesso da altri siti si riprova senza Web Audio
          if (cors) {
            gainRef.current = null;
            setCors(false);
          }
        }}
        preload="auto"
        onEnded={() => (loopRef.current && !intero ? avvia() : ferma())}
      />
      <button
        type="button"
        onClick={() => (suona ? ferma() : avvia(true))}
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
      <label className="mx-auto flex max-w-xs items-center gap-3 text-xs muted">
        <button
          type="button"
          onClick={() => {
            attivaVolume();
            setVolume((v) => (v > 0 ? 0 : 0.8));
          }}
          aria-label={volume > 0 ? it.quiz.sigla.silenzia : it.quiz.sigla.riattiva}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <Icon name={volume > 0 ? "volume" : "mute"} className="size-4 text-white" />
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => {
            attivaVolume();
            setVolume(Number(e.target.value) / 100);
          }}
          className="h-2 flex-1 cursor-pointer accent-[#7a86ff]"
          aria-label={it.quiz.sigla.volume}
          data-testid="ascolto-volume"
        />
        <span className="w-9 text-right tabular-nums">{Math.round(volume * 100)}%</span>
      </label>
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
