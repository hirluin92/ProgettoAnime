"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import it from "@/i18n/it.json";
import { SECONDI_SIGLA } from "@/lib/quiz";

// Lettore dell'anteprima di una sigla: si ascolta solo l'inizio, che si allunga a ogni errore.
// L'audio è l'anteprima di 30 secondi ospitata da Apple: non viene copiata né scaricata.

// Gli ascolti in loop usano un buffer Web Audio invece dell'elemento <audio>: il ritorno all'inizio è
// senza stacco. Su iPhone riportare l'elemento audio a 0 mentre suona fa ripartire il caricamento e la
// musica si ferma per circa un secondo a ogni giro. Il buffer si scarica una volta sola (circa 1 MB).
const buffers = new Map<string, Promise<AudioBuffer>>();
function caricaBuffer(ctx: AudioContext, src: string): Promise<AudioBuffer> {
  let p = buffers.get(src);
  if (!p) {
    p = fetch(src, { mode: "cors" })
      .then((r) => {
        if (!r.ok) throw new Error("audio non disponibile");
        return r.arrayBuffer();
      })
      .then((ab) => new Promise<AudioBuffer>((ok, ko) => ctx.decodeAudioData(ab, ok, ko)));
    p.catch(() => buffers.delete(src));
    buffers.set(src, p);
  }
  return p;
}

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
  const [carica, setCarica] = useState(false); // la canzone sta caricando (rete lenta)
  // vero finché si vuole che la canzone stia suonando: serve a distinguere una pausa voluta da una
  // pausa subita (altro audio, telefonata, schermo spento, rete)
  const voluto = useRef(false);
  const tentativi = useRef(0);
  const attesa = useRef<number | undefined>(undefined);
  // motore a buffer (loop senza stacco)
  const sorgente = useRef<AudioBufferSourceNode | null>(null);
  const bufferCorrente = useRef<AudioBuffer | null>(null);
  const motoreBuffer = useRef(false);
  const avvioBuf = useRef(0); // istante del contesto in cui l'ascolto è partito
  const finestra = useRef(0); // durata del giro del loop (0 = nessun loop)
  const riavvio = useRef(false); // l'elemento audio sta ripartendo da noi: le sue pause non contano
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
      // se il telefono sospende l'audio (schermo spento, altra app) lo si riprende appena possibile
      ctx.onstatechange = () => {
        if (ctx.state !== "running" && voluto.current) void ctx.resume().catch(() => undefined);
      };
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
      fermaSorgente();
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

  // il timer di fine anteprima legge i valori di adesso, non quelli di quando è partito
  const secondiRef = useRef(secondi);
  secondiRef.current = secondi;
  const interoRef = useRef(!!intero);
  interoRef.current = !!intero;

  const fermaSorgente = () => {
    const s = sorgente.current;
    sorgente.current = null;
    motoreBuffer.current = false;
    if (s) {
      s.onended = null;
      try {
        s.stop();
      } catch {
        /* già fermo */
      }
    }
  };

  const ferma = () => {
    voluto.current = false;
    window.clearTimeout(timer.current);
    window.clearTimeout(attesa.current);
    fermaSorgente();
    ref.current?.pause();
    setSuona(false);
    setCarica(false);
    setTempo(0);
  };
  // `gesto`: chiamata da un tocco dell'utente. Solo lì si attiva il controllo di volume Web Audio:
  // creato senza un tocco, il contesto resta sospeso e l'audio non scorre.
  const avviaBuffer = async (): Promise<boolean> => {
    const ctx = ctxRef.current;
    const g = gainRef.current;
    if (!ctx || !g) return false;
    voluto.current = true;
    setCarica(true);
    if (ctx.state !== "running") {
      // senza un tocco il contesto non parte (iPhone): non si resta in attesa all'infinito
      await Promise.race([
        ctx.resume().catch(() => undefined),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
      if ((ctx.state as AudioContextState) !== "running") {
        setCarica(false);
        return false;
      }
    }
    let buf: AudioBuffer;
    try {
      buf = await caricaBuffer(ctx, src);
    } catch {
      setCarica(false);
      return false;
    }
    if (!voluto.current) return true; // nel frattempo è stato fermato
    fermaSorgente();
    ref.current?.pause(); // l'elemento resta in silenzio: suona solo il buffer
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const giro = Math.min(secondiRef.current, buf.duration);
    s.loop = true;
    s.loopStart = 0;
    s.loopEnd = giro;
    s.connect(g);
    s.start(0, 0);
    sorgente.current = s;
    bufferCorrente.current = buf;
    motoreBuffer.current = true;
    avvioBuf.current = ctx.currentTime;
    finestra.current = giro;
    window.clearTimeout(timer.current);
    setTempo(0);
    setCarica(false);
    setErrore(false);
    setSuona(true);
    return true;
  };

  const avvia = (gesto = false) => {
    const a = ref.current;
    if (!a) return;
    window.clearTimeout(timer.current);
    if (gesto) attivaVolume();
    const ctx = ctxRef.current;
    if (
      loopRef.current &&
      !interoRef.current &&
      ctx &&
      gainRef.current &&
      (gesto || ctx.state === "running")
    ) {
      voluto.current = true;
      void avviaBuffer().then((ok) => {
        if (!ok && voluto.current) avviaElemento();
      });
      return;
    }
    fermaSorgente();
    avviaElemento();
  };

  const avviaElemento = () => {
    const a = ref.current;
    if (!a) return;
    voluto.current = true;
    void ctxRef.current?.resume().catch(() => undefined);
    riavvio.current = true;
    window.setTimeout(() => (riavvio.current = false), 1500);
    a.currentTime = 0;
    setTempo(0);
    a.play()
      .then(() => {
        if (!voluto.current) return; // nel frattempo è stato fermato: niente timer orfano
        setSuona(true);
        setErrore(false);
        // a fine anteprima: si ripete se il loop è attivo, altrimenti si ferma
        timer.current = window.setTimeout(() => {
          if (loopRef.current && !interoRef.current) avvia();
          else ferma();
        }, secondiRef.current * 1000);
      })
      .catch(() => {
        // un nuovo avvio ha interrotto questo (cambio di domanda): non è un errore
        if (voluto.current && ref.current?.paused !== false) setErrore(true);
      });
  };

  // mentre suona, la barra segue la posizione dell'audio
  useEffect(() => {
    if (!suona) return;
    let id = 0;
    let ultimo = 0;
    const giro = (t: number) => {
      // la barra si aggiorna ~12 volte al secondo: ridisegnare a ogni frame appesantisce i telefoni
      if (t - ultimo > 80) {
        ultimo = t;
        const ctx = ctxRef.current;
        if (motoreBuffer.current && ctx) {
          const el = ctx.currentTime - avvioBuf.current;
          setTempo(finestra.current > 0 ? el % finestra.current : el);
        } else setTempo(ref.current?.currentTime ?? 0);
      }
      id = requestAnimationFrame(giro);
    };
    id = requestAnimationFrame(giro);
    return () => cancelAnimationFrame(id);
  }, [suona]);

  // alla rivelazione la canzone prosegue fino in fondo: il timer dell'anteprima non deve fermarla
  useEffect(() => {
    const a = ref.current;
    if (!intero || !voluto.current || !a) return;
    if (motoreBuffer.current) {
      // in loop con il buffer: si prosegue dal punto raggiunto fino alla fine, senza ripetere
      const ctx = ctxRef.current;
      const g = gainRef.current;
      const buf = bufferCorrente.current;
      if (ctx && g && buf) {
        const el = ctx.currentTime - avvioBuf.current;
        const pos = finestra.current > 0 ? el % finestra.current : el;
        fermaSorgente();
        const s = ctx.createBufferSource();
        s.buffer = buf;
        s.connect(g);
        s.start(0, Math.min(pos, buf.duration));
        s.onended = () => {
          if (sorgente.current === s) ferma();
        };
        sorgente.current = s;
        motoreBuffer.current = true;
        avvioBuf.current = ctx.currentTime - pos;
        finestra.current = 0;
      }
      return;
    }
    window.clearTimeout(timer.current);
    const resto = Math.max(0, (Number.isFinite(a.duration) ? a.duration : 30) - a.currentTime);
    timer.current = window.setTimeout(ferma, (resto + 0.5) * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intero]);

  // Collegato il volume, l'audio dell'elemento passa dal contesto Web Audio: se il telefono lo sospende
  // (altra app, schermo spento, iPhone che lo «interrompe») la canzone sembra suonare ma è muta.
  // Qualsiasi tocco sulla pagina è un gesto valido per riattivarlo (anche «Salta e ascolta di più»).
  useEffect(() => {
    const riattiva = () => {
      const ctx = ctxRef.current;
      if (ctx && (ctx.state as AudioContextState) !== "running")
        void ctx.resume().catch(() => undefined);
    };
    const eventi = ["pointerdown", "touchend", "keydown"] as const;
    eventi.forEach((e) => document.addEventListener(e, riattiva, { passive: true }));
    return () => eventi.forEach((e) => document.removeEventListener(e, riattiva));
  }, []);

  // se si torna sulla pagina (schermo riacceso, altra app) l'audio sospeso riparte
  useEffect(() => {
    const torna = () => {
      if (document.visibilityState !== "visible") return;
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== "running") void ctx.resume().catch(() => undefined);
      const a = ref.current;
      if (voluto.current && !motoreBuffer.current && a && a.paused && !a.ended)
        a.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", torna);
    return () => document.removeEventListener("visibilitychange", torna);
  }, []);

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
      data-tempo={tempo.toFixed(1)}
      data-motore={motoreBuffer.current ? "buffer" : "elemento"}
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
            return;
          }
          // rete caduta: si riprova a caricare un paio di volte prima di arrendersi
          const a = ref.current;
          if (voluto.current && a && tentativi.current < 2) {
            tentativi.current += 1;
            window.setTimeout(() => {
              a.load();
              if (voluto.current) a.play().catch(() => undefined);
            }, 600);
          } else setErrore(true);
        }}
        preload="auto"
        onPlaying={() => {
          riavvio.current = false;
          window.clearTimeout(attesa.current);
          tentativi.current = 0;
          setCarica(false);
          setErrore(false);
          setSuona(true);
        }}
        onWaiting={() => {
          if (!voluto.current) return;
          setCarica(true);
          // se resta bloccata più di 8 secondi si ricarica la canzone dal punto in cui era
          window.clearTimeout(attesa.current);
          attesa.current = window.setTimeout(() => {
            const a = ref.current;
            if (!voluto.current || !a) return;
            const t = a.currentTime;
            a.load();
            a.currentTime = t;
            a.play().catch(() => undefined);
          }, 8000);
        }}
        onPause={() => {
          const a = ref.current;
          // pausa non voluta (telefonata, altro audio, cuffie): l'interfaccia lo dice e si riprova
          if (
            !voluto.current ||
            !a ||
            a.ended ||
            a.seeking ||
            riavvio.current ||
            motoreBuffer.current
          )
            return;
          setSuona(false);
          setCarica(false);
          window.setTimeout(() => {
            if (voluto.current && ref.current?.paused && document.visibilityState === "visible")
              ref.current.play().catch(() => undefined);
          }, 500);
        }}
        onEnded={() => (loopRef.current && !interoRef.current ? avvia() : ferma())}
      />
      <button
        type="button"
        onClick={() => (suona ? ferma() : avvia(true))}
        className="btn btn-primary mx-auto size-24 !rounded-full !p-0"
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
              ? secondi === 1
                ? it.quiz.sigla.secondo
                : it.quiz.sigla.secondi
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
                className={`relative h-3 flex-1 overflow-hidden border-[1.5px] ${
                  aperto ? "border-carta bg-black" : "border-white/20 bg-white/5"
                }`}
                style={{ flexGrow: !progressivo ? 1 : s === 1 ? 1 : Math.log2(s) + 1 }}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-[var(--accent)]"
                  style={{ width: `${riempi * 100}%` }}
                />
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between text-[0.7rem] tabular-nums muted">
          <span>{mmss(tempo)}</span>
          {carica && (
            <span
              role="status"
              data-testid="ascolto-carica"
              className="text-[var(--giallo,#ffd21f)]"
            >
              {it.quiz.sigla.carico}
            </span>
          )}
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
          className="grid size-11 shrink-0 place-items-center border-2 border-[var(--line-forte)] bg-[#201f26] hover:border-carta"
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
          className="flex-1"
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
          className={`chip mx-auto min-h-9 cursor-pointer px-3 py-1 ${loop ? "border-black bg-carta text-nero" : "muted"}`}
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
