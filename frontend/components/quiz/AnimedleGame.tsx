"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fmt } from "@/components/duello/DuelloBoard";
import Icon from "@/components/Icon";
import AnimeSearch from "@/components/quiz/AnimeSearch";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { useProfile } from "@/lib/profile";
import {
  quadratini,
  type AnimedleEsito,
  type AnimedleStato,
  type FeedbackAnimedle,
  type SoluzioneAnime,
  type VoceAnime,
} from "@/lib/quiz";

interface Riga {
  anime: VoceAnime;
  feedback: FeedbackAnimedle;
}

const COLONNE = [
  "anno",
  "episodi",
  "voto",
  "studio",
  "generi",
  "formato",
  "fonte",
  "stagione",
] as const;
const NOMI = it.quiz.animedle.colonne as Record<string, string>;
const FORMATI: Record<string, string> = { TV: "TV", MOVIE: "Film" };
const FONTI: Record<string, string> = {
  MANGA: "Manga",
  LIGHT_NOVEL: "Light novel",
  ORIGINAL: "Originale",
  VISUAL_NOVEL: "Visual novel",
  VIDEO_GAME: "Videogioco",
  OTHER: "Altro",
  NOVEL: "Romanzo",
  WEB_NOVEL: "Web novel",
  ANIME: "Anime",
};
const STAGIONI: Record<string, string> = {
  WINTER: "Inverno",
  SPRING: "Primavera",
  SUMMER: "Estate",
  FALL: "Autunno",
};

function colore(esito: string, vicino?: boolean) {
  if (esito === "uguale") return "bg-emerald-500/85 border-emerald-200/60";
  if (esito === "parziale" || vicino) return "bg-amber-500/85 border-amber-200/60";
  return "bg-rose-900/55 border-rose-300/25";
}

function Cella({
  i,
  esito,
  vicino,
  children,
}: {
  i: number;
  esito: string;
  vicino?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ rotateX: 90, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{ delay: 0.15 + i * 0.16, duration: 0.45 }}
      className={`grid min-h-[4.2rem] place-items-center rounded-xl border px-1.5 py-1 text-center text-[0.8rem] font-bold leading-tight text-white shadow-inner ${colore(esito, vicino)}`}
      data-esito={esito}
    >
      {children}
    </motion.div>
  );
}

function Frecce({ esito }: { esito: string }) {
  if (esito === "piu") return <Icon name="arrowup" className="size-5" />;
  if (esito === "meno") return <Icon name="arrowdown" className="size-5" />;
  return null;
}

function RigaView({ r }: { r: Riga }) {
  const f = r.feedback;
  return (
    <div
      className="grid grid-cols-[7.5rem_repeat(8,minmax(4.6rem,1fr))] items-stretch gap-1.5"
      data-testid="animedle-riga"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center rounded-xl border bg-white/[0.06] px-2 text-[0.8rem] font-extrabold leading-tight"
      >
        <span className="line-clamp-3">{r.anime.nome}</span>
      </motion.div>
      {(["anno", "episodi", "voto"] as const).map((c, i) => (
        <Cella key={c} i={i} esito={f[c].esito} vicino={f[c].vicino}>
          <span className="flex flex-col items-center">
            <span className="text-base">{f[c].valore}</span>
            <Frecce esito={f[c].esito} />
          </span>
        </Cella>
      ))}
      <Cella i={3} esito={f.studio.esito}>
        {f.studio.valori.join(", ") || "—"}
      </Cella>
      <Cella i={4} esito={f.generi.esito}>
        <span className="text-[0.7rem]">
          {f.generi.valori.map((g, k) => (
            <span key={g} className={f.generi.giusti.includes(g) ? "" : "opacity-60"}>
              {g}
              {k < f.generi.valori.length - 1 ? ", " : ""}
            </span>
          ))}
        </span>
      </Cella>
      <Cella i={5} esito={f.formato.esito}>
        {FORMATI[f.formato.valore] ?? f.formato.valore}
      </Cella>
      <Cella i={6} esito={f.fonte.esito}>
        {FONTI[f.fonte.valore] ?? f.fonte.valore}
      </Cella>
      <Cella i={7} esito={f.stagione.esito}>
        {STAGIONI[f.stagione.valore] ?? f.stagione.valore}
      </Cella>
    </div>
  );
}

const chiave = (giorno: string) => `arena.animedle.${giorno}`;

export default function AnimedleGame({ libero }: { libero: boolean }) {
  const { profile, loading, reload } = useProfile();
  const [stato, setStato] = useState<AnimedleStato | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [righe, setRighe] = useState<Riga[]>([]);
  const [finito, setFinito] = useState(false);
  const [vinto, setVinto] = useState(false);
  const [crediti, setCrediti] = useState(0);
  const [soluzione, setSoluzione] = useState<SoluzioneAnime | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);
  const massimo = stato?.tentativi_max ?? 8;

  const avvia = useCallback(async () => {
    setErrore(null);
    setRighe([]);
    setFinito(false);
    setVinto(false);
    setCrediti(0);
    setSoluzione(null);
    try {
      if (libero) {
        const n = await api<{ token: string; tentativi_max: number }>("/api/quiz/animedle/nuovo", {
          method: "POST",
        });
        setToken(n.token);
        setStato({
          giorno: "",
          tentativi_max: n.tentativi_max,
          tentativi_fatti: 0,
          finito: false,
          vinto: false,
          serie: 0,
          crediti: 0,
          bersaglio: null,
        });
        return;
      }
      const q = profile ? `?profile_id=${profile.id}` : "";
      const s = await api<AnimedleStato>(`/api/quiz/animedle/stato${q}`);
      setStato(s);
      setFinito(s.finito);
      setVinto(s.vinto);
      setCrediti(s.crediti);
      setSoluzione(s.bersaglio);
      const salvato = window.localStorage.getItem(chiave(s.giorno));
      if (salvato) setRighe(JSON.parse(salvato) as Riga[]);
    } catch (e) {
      setErrore((e as Error).message);
    }
  }, [libero, profile]);

  useEffect(() => {
    if (!loading) void avvia();
  }, [loading, avvia]);

  const provati = useMemo(() => new Set(righe.map((r) => r.anime.id)), [righe]);

  const prova = async (a: VoceAnime) => {
    if (!stato || finito) return;
    setErrore(null);
    try {
      const esito = await api<AnimedleEsito>("/api/quiz/animedle/guess", {
        method: "POST",
        body: JSON.stringify({
          anime_id: a.id,
          profile_id: !libero && profile ? profile.id : undefined,
          token: libero ? token : undefined,
          n: righe.length + 1,
        }),
      });
      const nuove = [...righe, { anime: a, feedback: esito.feedback }];
      setRighe(nuove);
      if (!libero && stato.giorno)
        window.localStorage.setItem(chiave(stato.giorno), JSON.stringify(nuove));
      if (esito.finito) {
        setTimeout(() => {
          setFinito(true);
          setVinto(esito.giusto);
          setCrediti(esito.crediti);
          setSoluzione(esito.bersaglio);
          if (esito.crediti) void reload();
          void aggiornaSerie();
        }, 1900);
      }
    } catch (e) {
      setErrore((e as Error).message);
    }
  };

  const aggiornaSerie = async () => {
    if (libero || !profile) return;
    try {
      setStato(await api<AnimedleStato>(`/api/quiz/animedle/stato?profile_id=${profile.id}`));
    } catch {
      /* la serie si aggiorna al prossimo caricamento */
    }
  };

  const arrenditi = async () => {
    try {
      const s = await api<SoluzioneAnime>("/api/quiz/animedle/arrenditi", {
        method: "POST",
        body: JSON.stringify({ profile_id: !libero && profile ? profile.id : undefined, token }),
      });
      setSoluzione(s);
      setFinito(true);
    } catch (e) {
      setErrore((e as Error).message);
    }
  };

  const condividi = async () => {
    const testo = `${it.quiz.animedle.titolo} ${stato?.giorno ?? ""} ${vinto ? righe.length : "X"}/${massimo}\n${righe
      .map((r) => quadratini(r.feedback))
      .join("\n")}`;
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    } catch {
      setErrore(it.quiz.copiaNonRiuscita);
    }
  };

  if (loading || !stato) return <main className="p-6">{errore ?? it.stanza.connessione}</main>;

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 pt-6" data-testid="animedle">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="eyebrow">{libero ? it.quiz.allenamento : it.quiz.delGiorno}</span>
          <h1 className="display text-5xl font-black">{it.quiz.animedle.titolo}</h1>
          <p className="max-w-2xl text-[0.95rem] muted">{it.quiz.animedle.intro}</p>
        </div>
        <div className="flex gap-2">
          <Link href={libero ? "/sfide/animedle" : "/sfide/animedle?libero=1"} className="btn">
            {libero ? it.quiz.delGiorno : it.quiz.allenamento}
          </Link>
          {libero && (
            <button className="btn" onClick={() => void avvia()} data-testid="animedle-nuovo">
              {it.quiz.nuova}
            </button>
          )}
        </div>
      </header>

      {!libero && !profile && <p className="panel p-3 text-sm muted">{it.quiz.senzaProfilo}</p>}

      <section className="panel space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span data-testid="animedle-tentativi" className="font-bold">
            {fmt(it.quiz.tentativi, { n: righe.length, max: massimo })}
          </span>
          {!libero && stato.serie > 0 && (
            <span className="chip">
              <Icon name="flame" className="size-4 text-orange-400" />
              {fmt(it.quiz.serie, { n: stato.serie })}
            </span>
          )}
        </div>
        {!finito && (
          <AnimeSearch onScegli={(a) => void prova(a)} esclusi={provati} testId="animedle-cerca" />
        )}
        {errore && (
          <p role="alert" className="text-rose-300">
            {errore}
          </p>
        )}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[56rem] space-y-1.5">
            <div className="grid grid-cols-[7.5rem_repeat(8,minmax(4.6rem,1fr))] gap-1.5 px-1 text-center text-[0.7rem] font-extrabold uppercase tracking-widest muted">
              <span className="text-left">{it.quiz.animedle.colonne.anime}</span>
              {COLONNE.map((c) => (
                <span key={c}>{NOMI[c]}</span>
              ))}
            </div>
            {[...righe].reverse().map((r) => (
              <RigaView key={r.anime.id} r={r} />
            ))}
            {righe.length === 0 && (
              <p className="py-8 text-center text-sm muted">{it.quiz.animedle.vuoto}</p>
            )}
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs muted">
          <li className="flex items-center gap-1.5">
            <i className="size-3 rounded bg-emerald-500" /> {it.quiz.animedle.legendaGiusto}
          </li>
          <li className="flex items-center gap-1.5">
            <i className="size-3 rounded bg-amber-500" /> {it.quiz.animedle.legendaVicino}
          </li>
          <li className="flex items-center gap-1.5">
            <i className="size-3 rounded bg-rose-900" /> {it.quiz.animedle.legendaNo}
          </li>
          <li className="flex items-center gap-1.5">
            <Icon name="arrowup" className="size-3.5" /> {it.quiz.animedle.legendaFreccia}
          </li>
        </ul>
        {!finito && righe.length > 0 && (
          <button className="text-sm underline muted" onClick={() => void arrenditi()}>
            {it.quiz.arrenditi}
          </button>
        )}
      </section>

      {finito && soluzione && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel flex flex-wrap items-center gap-5 p-5"
          data-testid="animedle-fine"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={soluzione.cover}
            alt=""
            referrerPolicy="no-referrer"
            className="h-40 rounded-xl border-2 border-white/30 shadow-xl"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <h2
              className={`display text-4xl font-black ${vinto ? "text-emerald-300" : "text-rose-300"}`}
            >
              {vinto ? it.quiz.indovinato : it.quiz.eraQuesto}
            </h2>
            <p className="text-2xl font-extrabold">{soluzione.titolo_en || soluzione.titolo}</p>
            <p className="muted">
              {soluzione.titolo} · {soluzione.anno}
            </p>
            {vinto && crediti > 0 && (
              <p
                className="inline-flex items-center gap-2 font-bold text-amber-300"
                data-testid="animedle-crediti"
              >
                <Icon name="coin" /> {fmt(it.quiz.guadagnati, { n: crediti })}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button className="btn btn-primary" onClick={() => void condividi()}>
                {copiato ? it.quiz.copiato : it.quiz.condividi}
              </button>
              {libero ? (
                <button className="btn" onClick={() => void avvia()}>
                  {it.quiz.nuova}
                </button>
              ) : (
                <Link href="/sfide" className="btn">
                  {it.quiz.altreSfide}
                </Link>
              )}
            </div>
          </div>
        </motion.section>
      )}
    </main>
  );
}
