"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
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
import Link from "next/link";
import DuelloBoard, { fmt } from "./DuelloBoard";
import DuelloCard, { DuelloTile } from "./DuelloCard";

type Fase = "regole" | "draft" | "gioco";
function Regole({ onOk }: { onOk: () => void }) {
  return (
    <section className="panel mx-auto max-w-xl space-y-4 p-6" data-testid="duello-regole">
      <h2 className="display text-3xl font-black">{it.duello.regole}</h2>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
        {it.duello.regoleLista.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
      <button className="btn btn-primary w-full" onClick={onOk} data-testid="duello-capito">
        {it.duello.capito}
      </button>
    </section>
  );
}

function Stelle({ n }: { n: number }) {
  return (
    <span aria-label={`${n} stelle`} className="text-amber-300">
      {"★".repeat(n)}
      <span className="text-white/20">{"★".repeat(3 - n)}</span>
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
        <ol className="space-y-1 text-sm">
          {righe.map((r, i) => (
            <li key={r.nome} className="flex items-center justify-between gap-3">
              <span>
                {i + 1}. {r.nome}
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

export default function DuelloGame({ giorno = false }: { giorno?: boolean }) {
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
  const skip = useRef(false);
  const { profile } = useProfile();
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
    setFase(window.localStorage.getItem(TUTORIAL_KEY) || giorno ? "draft" : "regole");
    if (giorno) {
      setInfo(await api<GiornoInfo>("/api/duello/giorno/info"));
      return;
    }
    setDraft(await api<DraftDuello>("/api/duello/draft"));
  }, [giorno]);
  useEffect(() => {
    carica().catch((e: Error) => setError(e.message));
  }, [carica]);

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
  if (giorno ? !info : !draft) return <main className="p-6">{it.stanza.connessione}</main>;

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
        <header className="space-y-1">
          <span className="eyebrow">{it.duello.titolo}</span>
          <h1 className="display text-4xl font-black">{it.duello.giornoTitolo}</h1>
          <p className="text-sm muted">{it.duello.giornoTesto}</p>
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
        <section className="panel flex flex-wrap items-end gap-3 p-5">
          <label className="flex-1 space-y-1 text-sm">
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
            className="btn btn-gold"
            disabled={busy || !nomeFinale || gia}
            onClick={via}
            data-testid="giorno-via"
          >
            {gia ? it.duello.giaGiocato : it.duello.giocaGiorno}
          </button>
        </section>
        <ClassificaGiorno righe={info.classifica} />
        <Link href="/duello" className="text-sm underline muted">
          {it.duello.indietro}
        </Link>
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
        const g = await api<DuelloState>("/api/duello/start", {
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
        <header className="space-y-1">
          <span className="eyebrow">{it.duello.titolo}</span>
          <h1 className="display text-4xl font-black">
            {pronto ? it.duello.mazzoPronto : it.duello.scegli}
          </h1>
          <p className="text-sm muted">{it.duello.sottotitolo}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
            <Link href="/duello/giorno" className="chip text-amber-200" data-testid="link-giorno">
              ★ {it.duello.giornoLink}
            </Link>
            {profile && (
              <span className="chip" data-testid="duello-elo">
                {fmt(it.duello.tuoElo, { n: profile.elo })}
              </span>
            )}
          </div>
        </header>
        {!pronto && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold" data-testid="duello-conta">
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
          <section className="space-y-2">
            <p className="text-sm" data-testid="duello-costo">
              {fmt(it.duello.costoMazzo, {
                n: scelte.reduce((t, c) => t + c.costo, 0),
                tot: ENERGIA_TOTALE,
              })}
            </p>
            <p className="text-xs muted">{it.duello.consiglioCosto}</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {scelte.map((c) => (
                <DuelloTile key={c.id} carta={c} potenza={c.potenza} />
              ))}
            </div>
          </section>
        )}
        {pronto && (
          <section className="panel space-y-4 p-5">
            <div className="space-y-2">
              <span className="eyebrow">{it.duello.livello}</span>
              <div className="flex gap-2">
                {LIVELLI.map((l) => (
                  <button
                    key={l}
                    className={`btn ${livello === l ? "btn-primary" : ""}`}
                    aria-pressed={livello === l}
                    onClick={() => setLivello(l)}
                  >
                    {it.duello.livelli[l]}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn btn-gold w-full"
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
          fmt(it.duello.rivela, {
            chi: e.lato === 0 ? it.duello.tu : it.duello.cpu,
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
    <main className="mx-auto max-w-7xl space-y-4 p-3 pt-5">
      <DuelloBoard
        stato={stato}
        avversario={it.duello.cpu}
        occupato={busy}
        caption={caption}
        onConferma={(m) => void conferma(m)}
        onSalta={() => (skip.current = true)}
      />
      {esito && stato.finita && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel space-y-4 p-6 text-center"
          data-testid="duello-esito"
        >
          <h2 className="display text-grad text-5xl font-black">
            {esito.vinto === null
              ? it.duello.pareggio
              : esito.vinto
                ? it.duello.vittoria
                : it.duello.sconfitta}
          </h2>
          <p className="muted">{fmt(it.duello.corsieVinte, { a: vinteTu, b: vinteCpu })}</p>
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
          {esito.premio && <PremioPanel premio={esito.premio} />}
          <button
            className="btn btn-primary"
            onClick={() => (giorno ? (window.location.href = "/duello") : carica().catch(err))}
            data-testid="duello-rigioca"
          >
            {giorno ? it.duello.indietro : it.duello.rigioca}
          </button>
        </motion.section>
      )}
    </main>
  );
}
