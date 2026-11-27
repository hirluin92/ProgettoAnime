"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fmt } from "@/components/duello/DuelloBoard";
import Icon from "@/components/Icon";
import AnimeSearch from "@/components/quiz/AnimeSearch";
import Ascolto from "@/components/quiz/Ascolto";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { useProfile } from "@/lib/profile";
import {
  FONTI,
  type GiocoZoom,
  type IndizioZoom,
  type SoluzioneZoom,
  type VoceAnime,
  type ZoomEsito,
  type ZoomNuovo,
  type ZoomStato,
} from "@/lib/quiz";

// Quanto è ingrandita l'immagine dopo 0, 1, 2… errori (1 = intera) e quanta sfocatura resta.
const ZOOM: Record<Exclude<GiocoZoom, "sigla">, number[]> = {
  scorcio: [5, 3.8, 2.8, 2, 1.5, 1.2, 1],
  personaggio: [4.2, 3.3, 2.5, 1.9, 1.4, 1.15, 1],
};
const SFOCA = [5, 3.5, 2, 1, 0, 0, 0];
const RUOLI: Record<string, string> = {
  MAIN: "Principale",
  SUPPORTING: "Secondario",
  BACKGROUND: "Comparsa",
};
const GENERI: Record<string, string> = { Male: "Maschio", Female: "Femmina" };
const ETICHETTE = it.quiz.indizi as Record<string, string>;

function valoreIndizio(i: IndizioZoom): string {
  if (i.k === "fonte") return FONTI[i.v] ?? i.v;
  if (i.k === "ruolo") return RUOLI[i.v] ?? i.v;
  if (i.k === "genere") return GENERI[i.v] ?? i.v;
  return i.v;
}

const chiave = (g: string, giorno: string) => `arena.zoom.${g}.${giorno}`;

export default function ZoomGame({ gioco, libero }: { gioco: GiocoZoom; libero: boolean }) {
  const { profile, loading, reload } = useProfile();
  const testi = it.quiz[gioco];
  const [stato, setStato] = useState<ZoomStato | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [errori, setErrori] = useState<VoceAnime[]>([]);
  const [indizi, setIndizi] = useState<IndizioZoom[]>([]);
  const [finito, setFinito] = useState(false);
  const [vinto, setVinto] = useState(false);
  const [crediti, setCrediti] = useState(0);
  const [soluzione, setSoluzione] = useState<SoluzioneZoom | null>(null);
  const [audio, setAudio] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);
  const massimo = stato?.tentativi_max ?? 6;

  const avvia = useCallback(async () => {
    setMessaggio(null);
    setErrori([]);
    setIndizi([]);
    setFinito(false);
    setVinto(false);
    setCrediti(0);
    setSoluzione(null);
    try {
      if (libero) {
        const n = await api<ZoomNuovo>(`/api/quiz/zoom/${gioco}/nuovo`, { method: "POST" });
        setToken(n.token);
        setAudio(n.audio ?? null);
        setStato({
          giorno: "",
          tentativi_max: n.tentativi_max,
          tentativi_fatti: 0,
          finito: false,
          vinto: false,
          serie: 0,
          crediti: 0,
          immagine: n.immagine,
          fx: n.fx,
          fy: n.fy,
          indizi: [],
          bersaglio: null,
        });
        return;
      }
      const q = profile ? `?profile_id=${profile.id}` : "";
      const s = await api<ZoomStato>(`/api/quiz/zoom/${gioco}/stato${q}`);
      setStato(s);
      setAudio(s.audio ?? null);
      setFinito(s.finito);
      setVinto(s.vinto);
      setCrediti(s.crediti);
      setSoluzione(s.bersaglio);
      setIndizi(s.indizi);
      const salvato = window.localStorage.getItem(chiave(gioco, s.giorno));
      if (salvato) setErrori(JSON.parse(salvato) as VoceAnime[]);
    } catch (e) {
      setMessaggio((e as Error).message);
    }
  }, [libero, profile, gioco]);

  useEffect(() => {
    if (!loading) void avvia();
  }, [loading, avvia]);

  const provati = useMemo(() => new Set(errori.map((e) => e.id)), [errori]);
  // errori fatti: se la partita è vinta l'ultimo tentativo non conta come errore
  const nErrori = errori.length;
  const livello =
    gioco === "sigla"
      ? Math.min(nErrori, 5)
      : finito
        ? ZOOM[gioco].length - 1
        : Math.min(nErrori, ZOOM[gioco].length - 2);
  const zoom = gioco === "sigla" ? 1 : ZOOM[gioco][livello];

  // `v` nullo = si salta il turno: conta come tentativo e sblocca di più
  const prova = async (v: VoceAnime | null) => {
    if (!stato || finito) return;
    setMessaggio(null);
    try {
      const e = await api<ZoomEsito>(`/api/quiz/zoom/${gioco}/guess`, {
        method: "POST",
        body: JSON.stringify({
          risposta_id: v?.id ?? 0,
          salta: v === null,
          profile_id: !libero && profile ? profile.id : undefined,
          token: libero ? token : undefined,
          n: errori.length + 1,
        }),
      });
      setIndizi(e.indizi);
      const scelto: VoceAnime = v ?? {
        id: -(errori.length + 1),
        nome: it.quiz.saltato,
        alt: "",
        k: "",
        anno: 0,
      };
      const nuovi = e.giusto ? errori : [...errori, scelto];
      setErrori(nuovi);
      if (!libero && stato.giorno)
        window.localStorage.setItem(chiave(gioco, stato.giorno), JSON.stringify(nuovi));
      if (e.finito) {
        setFinito(true);
        setVinto(e.giusto);
        setCrediti(e.crediti);
        setSoluzione(e.bersaglio);
        if (e.crediti) void reload();
        if (!libero && profile)
          setStato(await api<ZoomStato>(`/api/quiz/zoom/${gioco}/stato?profile_id=${profile.id}`));
      } else if (!e.giusto)
        setMessaggio(v ? it.quiz.sbagliato.replace("{nome}", v.nome) : it.quiz.saltoFatto[gioco]);
    } catch (e) {
      setMessaggio((e as Error).message);
    }
  };

  const arrenditi = async () => {
    try {
      setSoluzione(
        await api<SoluzioneZoom>(`/api/quiz/zoom/${gioco}/arrenditi`, {
          method: "POST",
          body: JSON.stringify({ profile_id: !libero && profile ? profile.id : undefined, token }),
        }),
      );
      setFinito(true);
    } catch (e) {
      setMessaggio((e as Error).message);
    }
  };

  const condividi = async () => {
    const quadri = "⬛".repeat(errori.length) + (vinto ? "🟩" : "");
    const testo = `${testi.titolo} ${stato?.giorno ?? ""} ${vinto ? errori.length + 1 : "X"}/${massimo}\n${quadri}`;
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    } catch {
      setMessaggio(it.quiz.copiaNonRiuscita);
    }
  };

  if (loading || !stato) return <main className="p-6">{messaggio ?? it.stanza.connessione}</main>;
  const ritratto = gioco === "personaggio";

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 pt-6" data-testid={`quiz-${gioco}`}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="eyebrow">{libero ? it.quiz.allenamento : it.quiz.delGiorno}</span>
          <h1 className="display text-5xl font-black">{testi.titolo}</h1>
          <p className="max-w-2xl text-[0.95rem] muted">{testi.intro}</p>
        </div>
        <div className="flex gap-2">
          <Link href={libero ? `/sfide/${gioco}` : `/sfide/${gioco}?libero=1`} className="btn">
            {libero ? it.quiz.delGiorno : it.quiz.allenamento}
          </Link>
          {libero && (
            <button className="btn" onClick={() => void avvia()} data-testid="zoom-nuovo">
              {it.quiz.nuova}
            </button>
          )}
        </div>
      </header>

      {!libero && !profile && <p className="panel p-3 text-sm muted">{it.quiz.senzaProfilo}</p>}

      <section className="panel space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-bold" data-testid="zoom-tentativi">
            {fmt(it.quiz.tentativi, {
              n: Math.min(massimo, errori.length + (vinto ? 1 : 0)),
              max: massimo,
            })}
          </span>
          {!libero && stato.serie > 0 && (
            <span className="chip">
              <Icon name="flame" className="size-4 text-orange-400" />
              {fmt(it.quiz.serie, { n: stato.serie })}
            </span>
          )}
        </div>

        {gioco === "sigla" ? (
          audio && <Ascolto src={audio} livello={livello} intero={finito} />
        ) : (
          <>
            {/* l'immagine si scopre a ogni errore */}
            <div
              className={`relative mx-auto overflow-hidden rounded-2xl border-2 border-white/25 bg-black shadow-2xl ${
                ritratto ? "aspect-[3/4] max-w-sm" : "aspect-[19/6] w-full"
              }`}
              data-testid="zoom-immagine"
              data-zoom={zoom}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stato.immagine}
                alt=""
                referrerPolicy="no-referrer"
                draggable={false}
                className="absolute inset-0 size-full select-none object-cover"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: `${stato.fx}% ${stato.fy}%`,
                  filter: `blur(${finito ? 0 : SFOCA[livello]}px)`,
                  transition: "transform 0.9s cubic-bezier(0.22,1,0.36,1), filter 0.9s ease",
                }}
              />
              <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgb(0_0_0/0.55)]" />
            </div>
          </>
        )}

        {indizi.length > 0 && (
          <ul className="flex flex-wrap justify-center gap-2" data-testid="zoom-indizi">
            {indizi.map((i) => (
              <motion.li
                key={i.k}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="chip px-3 py-1 text-[0.85rem]"
              >
                <b className="text-cyan-200">{ETICHETTE[i.k] ?? i.k}:</b> {valoreIndizio(i)}
              </motion.li>
            ))}
          </ul>
        )}

        {!finito && (
          <AnimeSearch
            onScegli={(v) => void prova(v)}
            esclusi={provati}
            personaggi={ritratto}
            testId="zoom-cerca"
          />
        )}
        {!finito && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="btn"
              onClick={() => void prova(null)}
              disabled={errori.length + 1 >= massimo}
              data-testid="zoom-salta"
              title={it.quiz.saltaAiuto}
            >
              {it.quiz.salta[gioco]}
            </button>
            <span className="text-xs muted">{it.quiz.saltaAiuto}</span>
          </div>
        )}
        {messaggio && (
          <p role="status" className="text-center text-sm text-amber-200">
            {messaggio}
          </p>
        )}

        {errori.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" data-testid="zoom-errori">
            {errori.map((e) => (
              <li
                key={e.id}
                className={`chip ${
                  e.id < 0 ? "muted" : "text-rose-200 line-through decoration-rose-300/60"
                }`}
              >
                {e.nome}
              </li>
            ))}
          </ul>
        )}
        {!finito && (
          <button className="text-sm underline muted" onClick={() => void arrenditi()}>
            {it.quiz.arrenditi}
          </button>
        )}
      </section>

      {finito && soluzione && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel space-y-2 p-5 text-center"
          data-testid="zoom-fine"
        >
          <h2
            className={`display text-4xl font-black ${vinto ? "text-emerald-300" : "text-rose-300"}`}
          >
            {vinto ? it.quiz.indovinato : it.quiz.eraQuesto}
          </h2>
          <p className="text-2xl font-extrabold">{soluzione.nome}</p>
          <p className="muted">{soluzione.dettaglio}</p>
          {vinto && crediti > 0 && (
            <p
              className="inline-flex items-center gap-2 font-bold text-amber-300"
              data-testid="zoom-crediti"
            >
              <Icon name="coin" /> {fmt(it.quiz.guadagnati, { n: crediti })}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
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
        </motion.section>
      )}
    </main>
  );
}
