"use client";

import { FENDENTE } from "@/lib/pennello";
import Icon from "@/components/Icon";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import Caricamento from "@/components/Caricamento";
import PremioPanel from "@/components/PremioPanel";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import {
  LIVELLI,
  TUTORIAL_KEY,
  type CartaView,
  type DraftDuello,
  type DuelloState,
  ENERGIA_TOTALE,
  type EventoDuello,
  type MossaIn,
  type GiornoEsito,
  type GiornoInfo,
  type GiornoRiga,
  type PickDuello,
  type StatoView,
  type TurnoOut,
} from "@/lib/duello";
import { getProfileId, useProfile } from "@/lib/profile";
import { nomeLega, type RankedStart } from "@/lib/ranked";
import type { RunView } from "@/lib/scalaDuelli";
import Link from "next/link";
import DuelloBoard, { fmt } from "./DuelloBoard";
import DuelloCard, { DuelloTile } from "./DuelloCard";

type Fase = "regole" | "draft" | "gioco";
function Regole({ onOk }: { onOk: () => void }) {
  return (
    <section
      className="panel-vivo mx-auto max-w-xl space-y-5 p-5 sm:p-7"
      data-testid="duello-regole"
    >
      <div className="testata">
        <span className="eyebrow">{it.duello.titolo}</span>
        <h1 className="striscia text-4xl">{it.duello.regole}</h1>
      </div>
      <ol className="passi text-[0.95rem] font-medium">
        {it.duello.regoleLista.map((r) => (
          <li key={r}>
            <span>{r}</span>
          </li>
        ))}
      </ol>
      <Link href="/come-si-gioca" className="btn w-full text-base">
        <Icon name="shield" /> {it.linkUtili.comeSiGioca}
      </Link>
      <button
        className="btn btn-primary min-h-14 w-full text-xl"
        onClick={onOk}
        data-testid="duello-capito"
      >
        {it.duello.capito}
      </button>
    </section>
  );
}

function Stelle({ n }: { n: number }) {
  return (
    <span aria-label={`${n} stelle`} className="text-amber-300">
      {[0, 1, 2].map((i) => (
        <Icon key={i} name="star" className={`size-[1.15em] ${i < n ? "" : "text-white/20"}`} />
      ))}
    </span>
  );
}

function ClassificaGiorno({ righe }: { righe: GiornoRiga[] }) {
  return (
    <section className="panel space-y-2 p-5" data-testid="giorno-classifica">
      <h2 className="eyebrow">{it.duello.classifica}</h2>
      {righe.length === 0 ? (
        <p className="text-sm muted">{it.duello.nessunoOggi}</p>
      ) : (
        <ol className="text-sm">
          {righe.map((r, i) => (
            <li key={r.nome} className="riga">
              <span>
                <span className="num mr-2">{i + 1}.</span>
                {r.nome}
              </span>
              <span>
                <Stelle n={r.stelle} /> <span className="muted">({r.punteggio})</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs muted">{it.duello.stelleSpiega}</p>
    </section>
  );
}

export default function DuelloGame({
  giorno = false,
  ranked = false,
  scala = false,
}: {
  giorno?: boolean;
  ranked?: boolean;
  scala?: boolean;
}) {
  const [fase, setFase] = useState<Fase>("draft");
  const [draft, setDraft] = useState<DraftDuello | null>(null);
  const [h, setH] = useState(0);
  const [rilanci, setRilanci] = useState(0);
  const [picks, setPicks] = useState<PickDuello[]>([]);
  const [livello, setLivello] = useState<string>("normale");
  const [partita, setPartita] = useState<DuelloState | null>(null);
  const [stato, setStato] = useState<StatoView | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [esito, setEsito] = useState<TurnoOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finaleChiuso, setFinaleChiuso] = useState(false);
  useEffect(() => {
    if (!stato?.finita) setFinaleChiuso(false);
  }, [stato?.finita]);
  const skip = useRef(false);
  const { profile } = useProfile();
  const [mazziProfilo, setMazziProfilo] = useState<string[]>([]);
  const [usaMazzo, setUsaMazzo] = useState(false);
  const [mazzoSel, setMazzoSel] = useState(0);
  const [rk, setRk] = useState<RankedStart | null>(null);
  const caricamento = useRef(0);
  const [run, setRun] = useState<RunView | null>(null);
  const [info, setInfo] = useState<GiornoInfo | null>(null);
  const [nome, setNome] = useState("");
  const [esitoGiorno, setEsitoGiorno] = useState<GiornoEsito | null>(null);

  const carica = useCallback(async () => {
    setError(null);
    setH(0);
    setRilanci(0);
    setPicks([]);
    setPartita(null);
    setStato(null);
    setEsito(null);
    setEsitoGiorno(null);
    setRun(null);
    setFase(window.localStorage.getItem(TUTORIAL_KEY) || giorno ? "draft" : "regole");
    if (giorno) {
      setInfo(await api<GiornoInfo>("/api/duello/giorno/info"));
      return;
    }
    if (ranked) {
      // in sviluppo l'effetto parte due volte: vale solo l'ultimo caricamento, con seme e mani coerenti
      const mio = ++caricamento.current;
      const st = await api<RankedStart>(`/api/ranked/${getProfileId()}/start`, { method: "POST" });
      const d = await api<DraftDuello>(`/api/duello/draft?seed=${st.seed}`);
      if (mio !== caricamento.current) return;
      setRk(st);
      setDraft(d);
      return;
    }
    setDraft(await api<DraftDuello>("/api/duello/draft"));
  }, [giorno, ranked]);
  useEffect(() => {
    carica().catch((e: Error) => setError(e.message));
  }, [carica]);

  useEffect(() => {
    if (!profile || giorno) return;
    api<{ mazzi: { nome: string; carte: string[] }[] }>(`/api/album/${profile.id}`)
      .then((a) => setMazziProfilo(a.mazzi.filter((m) => m.carte.length === 8).map((m) => m.nome)))
      .catch(() => undefined);
  }, [profile, giorno]);

  const err = (e: unknown) => setError(e instanceof Error ? e.message : it.duello.errore);

  if (error)
    return (
      <main className="mx-auto max-w-md p-6 pt-16">
        <div role="alert" className="panel space-y-4 p-6 text-center">
          <p className="text-lg font-bold">{error}</p>
          <button className="btn btn-primary" onClick={() => carica().catch(err)}>
            {it.errori.riprova}
          </button>
        </div>
      </main>
    );
  if (giorno ? !info : !draft)
    return (
      <Caricamento
        titolo={
          giorno
            ? it.seo.giorno.h1
            : scala
              ? it.seo.scala.h1
              : ranked
                ? it.seo.ranked.h1
                : it.seo.duello.h1
        }
      />
    );

  if (fase === "regole")
    return (
      <main className="mx-auto max-w-7xl p-4 pt-8">
        <Regole
          onOk={() => {
            window.localStorage.setItem(TUTORIAL_KEY, "1");
            setFase("draft");
          }}
        />
      </main>
    );

  // ---------- rompicapo del giorno: presentazione ----------
  if (giorno && info && (fase === "draft" || !partita || !stato)) {
    const gia = info.classifica.some(
      (r) => r.nome.toLowerCase() === (nome || profile?.name || "").trim().toLowerCase(),
    );
    const nomeFinale = (nome || profile?.name || "").trim();
    const via = async () => {
      setBusy(true);
      try {
        const g = await api<DuelloState>("/api/duello/giorno/start", {
          method: "POST",
          body: JSON.stringify({ name: nomeFinale, profile_id: getProfileId() }),
        });
        setPartita(g);
        setStato(g.stato);
        setFase("gioco");
      } catch (e) {
        err(e);
      } finally {
        setBusy(false);
      }
    };
    return (
      <main className="mx-auto max-w-7xl space-y-5 p-4 pt-6" data-testid="duello-giorno">
        <header className="testata space-y-1">
          <span className="eyebrow">{it.duello.titolo}</span>
          <h1 className="text-4xl sm:text-5xl">{it.duello.giornoTitolo}</h1>
          <p className="max-w-2xl text-[0.95rem] font-medium muted">{it.duello.giornoTesto}</p>
        </header>
        <section className="space-y-2">
          <h2 className="eyebrow">{it.duello.latuoMazzo}</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {info.mazzo.map((c) => (
              <DuelloTile key={c.id} carta={c} potenza={c.potenza} />
            ))}
          </div>
          <h2 className="eyebrow pt-2">{it.duello.mazzoCpu}</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {info.mazzo_cpu.map((c) => (
              <DuelloTile key={c.id} carta={c} potenza={c.potenza} tinta="cpu" />
            ))}
          </div>
        </section>
        <section className="panel-vivo flex flex-wrap items-end gap-4 p-5">
          <label className="min-w-[12rem] flex-1 space-y-1 text-sm">
            <span className="eyebrow">{it.duello.tuoNome}</span>
            <input
              className="field w-full"
              maxLength={24}
              value={nome || profile?.name || ""}
              onChange={(e) => setNome(e.target.value)}
              data-testid="giorno-nome"
            />
          </label>
          <button
            className="btn btn-primary min-h-12 px-8 text-lg"
            disabled={busy || !nomeFinale || gia}
            onClick={via}
            data-testid="giorno-via"
          >
            {gia ? it.duello.giaGiocato : it.duello.giocaGiorno}
          </button>
        </section>
        <ClassificaGiorno righe={info.classifica} />
        <Link
          href="/duello"
          className="inline-flex min-h-11 items-center text-sm font-bold underline muted"
        >
          {it.duello.indietro}
        </Link>
      </main>
    );
  }
  // ---------- La Scala: tra un duello e l'altro ----------
  if (scala && run && (!partita || !stato)) {
    const combatti = async () => {
      setBusy(true);
      try {
        const g = await api<DuelloState>(`/api/scala-duelli/${run.run_id}/gioca`, {
          method: "POST",
        });
        setPartita(g);
        setStato(g.stato);
        setEsito(null);
        setFase("gioco");
      } catch (e) {
        err(e);
      } finally {
        setBusy(false);
      }
    };
    const av = run.avversario;
    return (
      <main className="mx-auto max-w-7xl space-y-5 p-4 pt-6" data-testid="scala-hub">
        <header className="testata space-y-1">
          <span className="eyebrow">{it.scalaD.titolo}</span>
          <h1 className="text-4xl sm:text-5xl" data-testid="scala-gradino">
            {fmt(it.scalaD.gradino, { n: run.gradino, tot: run.max_gradini })}
            {av.boss && <span className="ml-3 text-[#c22417]">{it.scalaD.boss}</span>}
          </h1>
          <p className="text-sm muted">
            {fmt(it.scalaD.avversario, { liv: av.livello, b: av.bonus })}
          </p>
        </header>
        <section className="space-y-2">
          <h2 className="eyebrow">
            {fmt(it.scalaD.tuoMazzo, { n: run.mazzo.length, max: run.max_mazzo })}
          </h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {run.mazzo.map((c) => (
              <DuelloTile key={c.id} carta={c} potenza={c.potenza} />
            ))}
          </div>
          <h2 className="eyebrow pt-2">{it.duello.mazzoCpu}</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {av.mazzo.map((c) => (
              <DuelloTile key={c.id} carta={c} potenza={c.potenza} tinta="cpu" />
            ))}
          </div>
        </section>
        <button
          className="btn btn-primary min-h-14 w-full text-xl"
          disabled={busy}
          onClick={() => void combatti()}
          data-testid="scala-combatti"
        >
          {it.scalaD.combatti}
        </button>
      </main>
    );
  }

  // ---------- draft ----------
  if (fase === "draft" || !partita || !stato) {
    if (!draft) return null;
    const pronto = picks.length === draft.mazzo;
    const mano = draft.mani[h] ?? [];
    const scelte = picks.map((p) => draft.mani[p.hand].find((c) => c.id === p.id)!);
    const prendi = (c: CartaView) => {
      setPicks([...picks, { id: c.id, hand: h }]);
      setH(h + 1);
    };
    const inizia = async () => {
      setBusy(true);
      try {
        if (scala) {
          const r = await api<RunView>("/api/scala-duelli/start", {
            method: "POST",
            body: JSON.stringify({ seed: draft.seed, picks, profile_id: getProfileId() }),
          });
          setRun(r);
          return;
        }
        const g = rk
          ? await api<DuelloState>(`/api/ranked/partita/${rk.ranked_id}/inizia`, {
              method: "POST",
              body: JSON.stringify({ picks }),
            })
          : await api<DuelloState>("/api/duello/start", {
              method: "POST",
              body: JSON.stringify({
                seed: draft.seed,
                picks,
                livello,
                profile_id: getProfileId(),
              }),
            });
        setPartita(g);
        setStato(g.stato);
        setFase("gioco");
      } catch (e) {
        err(e);
      } finally {
        setBusy(false);
      }
    };
    return (
      <main className="mx-auto max-w-7xl space-y-5 p-4 pt-6" data-testid="duello-draft">
        <header className="testata space-y-1">
          <span className="eyebrow">
            {scala ? it.scalaD.titolo : ranked ? it.ranked.titolo : it.duello.titolo}
          </span>
          <h1 className="text-4xl sm:text-5xl">
            {pronto ? it.duello.mazzoPronto : it.duello.scegli}
          </h1>
          <p className="text-[0.95rem] font-medium muted">{it.duello.sottotitolo}</p>
          {rk && (
            <p className="chip border-black bg-carta text-nero" data-testid="ranked-avversario">
              {fmt(it.ranked.avversario, {
                nome: rk.avversario.nome,
                lega: nomeLega(rk.avversario.lega, rk.avversario.divisione),
              })}{" "}
              · {rk.avversario.fantasma ? it.ranked.fantasma : it.ranked.sfidante}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
            {!ranked && !scala && (
              <Link href="/ranked" className="chip text-cyan-200">
                <Icon name="swords" /> {it.ranked.giocaClassificata}
              </Link>
            )}
            <Link href="/duello/giorno" className="chip text-amber-200" data-testid="link-giorno">
              <Icon name="star" /> {it.duello.giornoLink}
            </Link>
            {profile && (
              <span className="chip" data-testid="duello-elo">
                {fmt(it.duello.tuoElo, { n: profile.elo })}
              </span>
            )}
          </div>
        </header>
        {!ranked && !scala && mazziProfilo.length > 0 && picks.length === 0 && (
          <div className="flex flex-wrap gap-2" data-testid="duello-tab">
            <button className="btn" aria-pressed={!usaMazzo} onClick={() => setUsaMazzo(false)}>
              {it.album.draftTab}
            </button>
            <button
              className="btn"
              aria-pressed={usaMazzo}
              onClick={() => setUsaMazzo(true)}
              data-testid="tab-mazzo"
            >
              {it.album.mazzoTab}
            </button>
          </div>
        )}
        {usaMazzo && picks.length === 0 && (
          <section className="panel-vivo space-y-4 p-5" data-testid="mazzo-personale">
            <div className="space-y-2">
              <span className="eyebrow">{it.album.scegliMazzo}</span>
              <div className="flex flex-wrap gap-2">
                {mazziProfilo.map((n, i) => (
                  <button
                    key={n + i}
                    className="btn"
                    aria-pressed={mazzoSel === i}
                    onClick={() => setMazzoSel(i)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <span className="eyebrow">{it.duello.livello}</span>
              <div className="flex gap-2">
                {LIVELLI.map((l) => (
                  <button
                    key={l}
                    className="btn"
                    aria-pressed={livello === l}
                    onClick={() => setLivello(l)}
                  >
                    {it.duello.livelli[l]}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs muted">{it.album.senzaElo}</p>
            <button
              className="btn btn-primary min-h-14 w-full text-xl"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const g = await api<DuelloState>("/api/duello/start-personale", {
                    method: "POST",
                    body: JSON.stringify({
                      profile_id: getProfileId(),
                      mazzo: mazzoSel,
                      livello,
                    }),
                  });
                  setPartita(g);
                  setStato(g.stato);
                  setFase("gioco");
                } catch (e) {
                  err(e);
                } finally {
                  setBusy(false);
                }
              }}
              data-testid="inizia-personale"
            >
              {it.duello.inizia}
            </button>
          </section>
        )}
        {!pronto && !usaMazzo && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="display text-2xl tracking-wide" data-testid="duello-conta">
                {fmt(it.duello.mano, { n: picks.length + 1, tot: draft.mazzo })}
              </span>
              <button
                className="btn"
                disabled={rilanci >= draft.rilanci}
                onClick={() => {
                  setRilanci(rilanci + 1);
                  setH(h + 1);
                }}
                data-testid="duello-rilancia"
              >
                {fmt(it.duello.rilancia, { n: draft.rilanci - rilanci })}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
              {mano.map((c) => (
                <DuelloCard
                  key={c.id}
                  carta={c}
                  onClick={() => prendi(c)}
                  testId="duello-offerta"
                />
              ))}
            </div>
          </section>
        )}
        {scelte.length > 0 && (
          <section className="panel space-y-2 p-4">
            <span className="eyebrow">{it.duello.latuoMazzo}</span>
            <p className="text-sm font-bold" data-testid="duello-costo">
              {fmt(it.duello.costoMazzo, {
                n: scelte.reduce((t, c) => t + c.costo, 0),
                tot: ENERGIA_TOTALE,
              })}
            </p>
            <p className="text-xs muted">{it.duello.consiglioCosto}</p>
            {scelte.length >= 5 && !scelte.some((c) => c.costo <= 2) && (
              <p
                className="border-2 border-[#ffd21f] bg-[#ffd21f]/10 px-3 py-2 text-sm font-bold text-amber-200"
                role="status"
              >
                {it.duello.avvisoCurva}
              </p>
            )}
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {scelte.map((c) => (
                <DuelloTile key={c.id} carta={c} potenza={c.potenza} />
              ))}
              {Array.from({ length: draft.mazzo - scelte.length }, (_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="num grid aspect-[1/1.2] place-items-center rounded-[3px] border-[1.5px] border-dashed border-white/20 text-sm text-white/25"
                >
                  {scelte.length + i + 1}
                </div>
              ))}
            </div>
          </section>
        )}
        {pronto && (
          <section className="panel-vivo space-y-4 p-5">
            <div className={`space-y-2 ${ranked || scala ? "hidden" : ""}`}>
              <span className="eyebrow">{it.duello.livello}</span>
              <div className="flex gap-2">
                {LIVELLI.map((l) => (
                  <button
                    key={l}
                    className="btn min-w-0 flex-1 sm:flex-none"
                    aria-pressed={livello === l}
                    onClick={() => setLivello(l)}
                  >
                    {it.duello.livelli[l]}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn btn-primary min-h-14 w-full text-xl"
              disabled={busy}
              onClick={inizia}
              data-testid="duello-inizia"
            >
              {it.duello.inizia}
            </button>
          </section>
        )}
      </main>
    );
  }

  // ---------- partita ----------
  const conferma = async (mosse: MossaIn[]) => {
    if (!partita || busy) return;
    setBusy(true);
    skip.current = false;
    try {
      const out = await api<TurnoOut>(`/api/duello/${partita.id}/turno`, {
        method: "POST",
        body: JSON.stringify({
          mosse,
        }),
      });
      const rivela = out.eventi.filter((e: EventoDuello) => e.t === "rivela" && e.carta_view);
      for (const e of rivela) {
        if (skip.current) break;
        setCaption(
          fmt(e.lato === 0 ? it.duello.rivelaTu : it.duello.rivela, {
            chi: it.duello.cpu,
            carta: e.carta_view!.nome,
            n: (e.corsia ?? 0) + 1,
          }) + (e.carta_view!.mossa !== "-" ? ` — ${e.carta_view!.testo_mossa}` : ""),
        );
        await new Promise((r) => setTimeout(r, 750));
      }
      setCaption(null);
      setStato(out.stato);
      if (out.finita) {
        setEsito(out);
        if (giorno)
          setEsitoGiorno(await api<GiornoEsito>(`/api/duello/giorno/${partita.id}/esito`));
      }
    } catch (e) {
      err(e);
    } finally {
      setBusy(false);
    }
  };

  const vinteTu = stato.corsie_vinte[0];
  const vinteCpu = stato.corsie_vinte[1];

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-2 pt-3 sm:p-3 sm:pt-5">
      <DuelloBoard
        stato={stato}
        avversario={it.duello.cpu}
        occupato={busy}
        caption={caption}
        onConferma={(m) => void conferma(m)}
        onSalta={() => (skip.current = true)}
      />
      {esito && stato.finita && finaleChiuso && (
        <button className="btn mx-auto flex" onClick={() => setFinaleChiuso(false)}>
          {it.duello.mostraEsito}
        </button>
      )}
      {esito && stato.finita && !finaleChiuso && (
        <div
          className="esplosione fixed inset-0 z-[55] grid place-items-center overflow-y-auto p-4"
          style={{
            ["--tinta" as string]:
              esito.vinto === null ? "#f3ecdd" : esito.vinto ? "#ffd21f" : "#5a5862",
          }}
        >
          <motion.section
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="my-auto w-full max-w-3xl space-y-5 py-6 text-center"
            data-testid="duello-esito"
          >
            <div className="flex justify-center gap-3" aria-hidden="true">
              {stato.totali.map(([tu, cpu], k) => (
                <motion.span
                  key={k}
                  initial={{ opacity: 0, y: 14, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.4 + k * 0.45, duration: 0.3 }}
                  className={`grid min-w-[5.5rem] place-items-center border-2 border-black px-3 py-2 shadow-[3px_3px_0_#000] ${
                    tu > cpu
                      ? "bg-[#35d68a] text-black"
                      : cpu > tu
                        ? "bg-[#e0301f] text-white"
                        : "bg-carta text-nero"
                  }`}
                >
                  <span className="text-[0.68rem] font-black uppercase tracking-widest">
                    {it.duello.corsia} {k + 1}
                  </span>
                  <span className="num text-2xl">
                    {tu}–{cpu}
                  </span>
                </motion.span>
              ))}
            </div>
            {/* la pennellata che passa dietro il verdetto */}
            <div className="relative" aria-hidden="true">
              <svg
                viewBox="0 0 200 24"
                preserveAspectRatio="none"
                className="pennellata absolute left-[4%] top-0 h-[clamp(4.5rem,16vw,9rem)] w-[92%] -rotate-3"
                style={{ animationDelay: "1.55s" }}
              >
                <path d={FENDENTE} fill={esito.vinto ? "#e0301f" : "#2b2a33"} />
              </svg>
            </div>
            <motion.h2
              initial={{ scale: 2.4, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: -4, opacity: 1 }}
              transition={{ delay: 1.75, duration: 0.35, ease: [0.3, 1.6, 0.5, 1] }}
              className={`not-italic leading-[0.9] ${
                esito.vinto
                  ? "onoma text-[clamp(3.6rem,15vw,8rem)]"
                  : "text-grad text-[clamp(3.4rem,14vw,7rem)]"
              }`}
            >
              {esito.vinto === null
                ? it.duello.pareggio
                : esito.vinto
                  ? it.duello.vittoria
                  : it.duello.sconfitta}
            </motion.h2>
            <p className="font-bold text-carta">
              {fmt(it.duello.corsieVinte, { a: vinteTu, b: vinteCpu })}
            </p>
            {esitoGiorno && (
              <div className="space-y-3 text-left">
                <div className="text-center text-3xl">
                  <Stelle n={esitoGiorno.stelle} />
                </div>
                <p className="text-center text-sm muted">
                  {fmt(it.duello.posizione, { n: esitoGiorno.posizione })}
                </p>
                <ClassificaGiorno righe={esitoGiorno.classifica} />
              </div>
            )}
            {esito.scala && (
              <div className="panel panel-solido space-y-3 p-4 text-left" data-testid="scala-esito">
                <p className="text-center font-bold">
                  {esito.scala.finita
                    ? esito.scala.completata
                      ? it.scalaD.completata
                      : it.scalaD.fine
                    : it.scalaD.vintoGradino}{" "}
                  · {fmt(it.scalaD.gradiniVinti, { n: esito.scala.vinti })}
                </p>
                {!esito.scala.finita && (
                  <>
                    <h3 className="eyebrow text-center">{it.scalaD.scegliPremio}</h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {esito.scala.offerte.map((o, i) => (
                        <div key={i} className="space-y-2 text-center">
                          <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-200">
                            {o.tipo === "carta" ? it.scalaD.carta : it.scalaD.rinforzo}
                          </p>
                          <DuelloCard carta={o.carta} />
                          <p className="text-xs">{o.testo}</p>
                          <button
                            className="btn btn-primary w-full"
                            disabled={busy}
                            data-testid={`scala-offerta-${i}`}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                const r = await api<RunView>(
                                  `/api/scala-duelli/${run?.run_id}/scegli`,
                                  { method: "POST", body: JSON.stringify({ indice: i }) },
                                );
                                setRun(r);
                                setPartita(null);
                                setStato(null);
                                setEsito(null);
                              } catch (e) {
                                err(e);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            {it.scalaD.scegli}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {esito.scala.finita && esito.scala.premio && (
                  <PremioPanel premio={esito.scala.premio} />
                )}
              </div>
            )}
            {esito.ranked && (
              <div
                className="panel panel-solido space-y-1 p-4 text-left"
                data-testid="ranked-esito"
              >
                <p className="font-bold">
                  {fmt(it.ranked.risultato, {
                    a: esito.ranked.mmr_prima,
                    b: esito.ranked.mmr_dopo,
                    d: `${esito.ranked.mmr_dopo - esito.ranked.mmr_prima >= 0 ? "+" : ""}${esito.ranked.mmr_dopo - esito.ranked.mmr_prima}`,
                  })}
                </p>
                <p className="text-sm muted">
                  {nomeLega(esito.ranked.lega_dopo, esito.ranked.divisione_dopo)}
                  {esito.ranked.in_piazzamento ? ` · ${it.ranked.piazzamentoFatto}` : ""}
                </p>
                {esito.ranked.promosso && (
                  <p className="font-bold text-emerald-300">
                    {fmt(it.ranked.promosso, {
                      lega: nomeLega(esito.ranked.lega_dopo, esito.ranked.divisione_dopo),
                    })}
                  </p>
                )}
                {esito.ranked.retrocesso && (
                  <p className="font-bold text-rose-300">
                    {fmt(it.ranked.retrocesso, {
                      lega: nomeLega(esito.ranked.lega_dopo, esito.ranked.divisione_dopo),
                    })}
                  </p>
                )}
              </div>
            )}
            {esito.premio && <PremioPanel premio={esito.premio} />}
            <button
              className={`btn btn-primary min-h-14 px-8 text-xl ${esito.scala && !esito.scala.finita ? "hidden" : ""}`}
              onClick={() =>
                giorno || ranked
                  ? (window.location.href = ranked ? "/ranked" : "/duello")
                  : carica().catch(err)
              }
              data-testid="duello-rigioca"
            >
              {ranked
                ? it.ranked.torna
                : scala
                  ? it.scalaD.ricomincia
                  : giorno
                    ? it.duello.indietro
                    : it.duello.rigioca}
            </button>
            <button className="btn mx-3 mt-3" onClick={() => setFinaleChiuso(true)}>
              {it.duello.vediPlancia}
            </button>
          </motion.section>
        </div>
      )}
    </main>
  );
}
