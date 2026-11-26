"use client";

import { useState } from "react";
import BattleScene from "@/components/battle/BattleScene";
import PremioPanel from "@/components/PremioPanel";
import TacticsPlanner, { type Carica } from "@/components/draft/TacticsPlanner";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { ARENE_INFO } from "@/lib/battle/arene";
import { FASI, type Tattica } from "@/lib/battle/tattiche";
import type { ScalaResult } from "@/lib/scala";

/** I gradini dopo il primo: scelta del potenziamento, piano, scontro, fino alla sconfitta. */
export default function ScalaLadder({ first }: { first: ScalaResult }) {
  const [cur, setCur] = useState<ScalaResult>(first);
  const [fighting, setFighting] = useState(false);
  const [upgrade, setUpgrade] = useState<number | null>(null);
  const [piano, setPiano] = useState<(Tattica | null)[]>(Array(FASI).fill(null));
  const [carica, setCarica] = useState<Carica>("subito");
  const [formazione, setFormazione] = useState("classica");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presi, setPresi] = useState<string[]>([]);

  const prossimo = cur.prossimo;
  const pronto = upgrade !== null && piano.every((t) => t !== null);

  const combatti = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<ScalaResult>(`/api/scala/${cur.run_id}/fight`, {
        method: "POST",
        body: JSON.stringify({ piano: { tattiche: piano, carica, formazione }, upgrade }),
      });
      setPresi((p) => [...p, cur.offerte[upgrade ?? 0].nome]);
      setCur(r);
      setFighting(true);
      setUpgrade(null);
      setPiano(Array(FASI).fill(null));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="scala">
      {fighting && cur !== first && (
        <section className="space-y-3">
          <h2 className="text-3xl font-extrabold">
            {it.scala.gradino} {cur.gradino}
          </h2>
          <BattleScene result={cur.result} autoplay onDone={() => setFighting(false)} />
        </section>
      )}
      {!fighting && (
        <>
          <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <span className="eyebrow">{it.scala.titolo}</span>
              <p className="display text-4xl font-black leading-none" data-testid="scala-vinti">
                {cur.gradini_vinti === 1
                  ? it.scala.vinto1
                  : it.scala.vinti.replace("{n}", String(cur.gradini_vinti))}
              </p>
            </div>
            {presi.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {presi.map((p, i) => (
                  <li key={i} className="chip text-cyan-200">
                    ⬆ {p}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {cur.finita ? (
            <section className="panel space-y-3 p-5" data-testid="scala-fine">
              <h2 className="text-4xl font-black">
                {cur.completata ? it.scala.completata : it.scala.fine}
              </h2>
              <p className="muted">
                {cur.gradini_vinti === 1
                  ? it.scala.riepilogo1
                  : it.scala.riepilogo.replace("{n}", String(cur.gradini_vinti))}
              </p>
              {cur.premio && <PremioPanel premio={cur.premio} />}
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                {it.scala.nuova}
              </button>
            </section>
          ) : (
            prossimo && (
              <>
                <section className="panel space-y-3 p-5" data-testid="scala-offerte">
                  <h3 className="text-2xl font-extrabold">{it.scala.sceglPot}</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {cur.offerte.map((o, i) => (
                      <button
                        key={o.id}
                        data-testid={`upgrade-${i}`}
                        aria-pressed={upgrade === i}
                        onClick={() => setUpgrade(i)}
                        className={`rounded-2xl border p-3 text-left transition ${
                          upgrade === i
                            ? "border-cyan-300 bg-cyan-300/20 shadow-[0_0_18px_rgb(53_224_255/0.4)]"
                            : "border-white/15 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <b className="display text-xl">{o.nome}</b>
                        <span className="block text-sm muted">{o.descrizione}</span>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel space-y-2 p-5" data-testid="scala-avversario">
                  <span className="eyebrow">
                    {it.scala.gradino} {prossimo.gradino}/{20}
                  </span>
                  <h3 className="text-3xl font-extrabold">{prossimo.nome}</h3>
                  <p className="text-sm">
                    {it.scala.forza}: <b>{prossimo.forza}</b> · {it.scala.tua}:{" "}
                    <b
                      className={
                        prossimo.forza_tua >= prossimo.forza ? "text-emerald-300" : "text-rose-300"
                      }
                    >
                      {prossimo.forza_tua}
                    </b>{" "}
                    · {ARENE_INFO[prossimo.arena]?.icona} {prossimo.arena_nome}
                  </p>
                  <ul className="flex flex-wrap gap-1.5 text-xs">
                    {prossimo.membri.map((m) => (
                      <li key={m.id} className="chip">
                        {m.nome}
                        {m.forma ? ` (${m.forma})` : ""} · {m.rating}
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="panel space-y-4 p-5">
                  <TacticsPlanner
                    value={piano}
                    onChange={(f, t) => setPiano((p) => p.map((x, i) => (i === f ? t : x)))}
                    carica={carica}
                    onCarica={setCarica}
                    formazione={formazione}
                    onFormazione={setFormazione}
                  />
                  {error && (
                    <p role="alert" className="text-rose-400">
                      {error}
                    </p>
                  )}
                  <button
                    className="btn btn-primary w-full text-lg"
                    data-testid="scala-fight"
                    disabled={!pronto || busy}
                    onClick={() => void combatti()}
                  >
                    {it.scala.combatti.replace("{n}", String(prossimo.gradino))}
                  </button>
                </section>
              </>
            )
          )}
        </>
      )}
    </div>
  );
}
