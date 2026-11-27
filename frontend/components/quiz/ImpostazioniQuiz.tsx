"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import it from "@/i18n/it.json";
import type { RoomSettings } from "@/lib/messages";

// Finestra con le impostazioni di una partita al quiz: giochi, round, durata dell'anteprima,
// loop, tempo per rispondere e cosa si deve indovinare.

type Q = RoomSettings;

const GIOCHI = ["misto", "scorcio", "personaggio", "indizi", "sigla"] as const;
const CHIEDE = ["tutto", "anime", "brano", "artista"] as const;

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function leggiTempo(t: string, minimo: number, massimo: number): number | null {
  const m = /^(\d{1,2}):([0-5]?\d)$/.exec(t.trim());
  const sec = m ? Number(m[1]) * 60 + Number(m[2]) : /^\d{1,3}$/.test(t.trim()) ? Number(t) : null;
  return sec === null ? null : Math.max(minimo, Math.min(massimo, sec));
}

function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="eyebrow">{titolo}</h3>
      {children}
    </section>
  );
}

function Cursore({
  etichetta,
  valore,
  min,
  max,
  suffisso,
  onChange,
  testId,
}: {
  etichetta: string;
  valore: number;
  min: number;
  max: number;
  suffisso?: string;
  onChange: (n: number) => void;
  testId?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[1.05rem] font-extrabold">{etichetta}</span>
      <span className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          value={valore}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer accent-[#7a86ff]"
          data-testid={testId}
          aria-label={etichetta}
        />
        <span className="display w-14 text-right text-2xl font-black normal-case tabular-nums">
          {valore}
          {suffisso}
        </span>
      </span>
    </label>
  );
}

function Segmentato<T extends string>({
  valore,
  opzioni,
  onChange,
  testId,
  etichetta,
}: {
  valore: T;
  opzioni: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  testId?: string;
  etichetta: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etichetta}
      className="flex flex-wrap gap-1 rounded-2xl border bg-black/40 p-1"
    >
      {opzioni.map(([v, nome]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === valore}
          onClick={() => onChange(v)}
          data-testid={testId ? `${testId}-${v}` : undefined}
          className={`min-h-11 flex-1 rounded-xl px-3 text-[0.95rem] font-extrabold transition ${
            v === valore
              ? "bg-gradient-to-r from-[#6f7dff] to-[#9a5cf5] text-white shadow-lg"
              : "text-white/70 hover:bg-white/10"
          }`}
        >
          {nome}
        </button>
      ))}
    </div>
  );
}

export default function ImpostazioniQuiz({
  s,
  upd,
  aperto,
  onChiudi,
}: {
  s: Q;
  upd: (p: Partial<Q>) => void;
  aperto: boolean;
  onChiudi: () => void;
}) {
  const t = it.quiz.imp;
  const conSigle = s.quiz_tipo === "sigla" || s.quiz_tipo === "misto";
  const [tempo, setTempo] = useState(mmss(s.quiz_tempo));
  useEffect(() => setTempo(mmss(s.quiz_tempo)), [s.quiz_tempo]);
  useEffect(() => {
    if (!aperto) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onChiudi();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [aperto, onChiudi]);

  return (
    <AnimatePresence>
      {aperto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/75 p-4"
          onClick={onChiudi}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t.titolo}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            className="panel panel-solido relative my-4 w-full max-w-xl space-y-6 p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
            data-testid="quiz-impostazioni-finestra"
          >
            <button
              type="button"
              onClick={onChiudi}
              aria-label={it.quiz.chiudi}
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              data-testid="quiz-impostazioni-chiudi"
            >
              <Icon name="x" className="size-5" />
            </button>
            <header className="space-y-1">
              <span className="eyebrow">{t.stanza}</span>
              <h2 className="display text-4xl font-black">{t.titolo}</h2>
            </header>

            <Sezione titolo={t.giochi}>
              <Segmentato
                etichetta={t.giochi}
                valore={s.quiz_tipo}
                onChange={(v) => upd({ quiz_tipo: v })}
                testId="quiz-tipo"
                opzioni={GIOCHI.map((g) => [g, it.quiz.stanza.tipi[g]] as const)}
              />
            </Sezione>

            <Sezione titolo={t.round}>
              <Cursore
                etichetta={t.numeroRound}
                valore={s.quiz_round}
                min={3}
                max={30}
                onChange={(n) => upd({ quiz_round: n })}
                testId="quiz-round"
              />
              {conSigle && (
                <>
                  <Cursore
                    etichetta={t.durataClip}
                    valore={s.quiz_clip}
                    min={5}
                    max={30}
                    suffisso="s"
                    onChange={(n) => upd({ quiz_clip: n })}
                    testId="quiz-clip"
                  />
                  <div className="space-y-2">
                    <p className="text-[1.05rem] font-extrabold">{t.anteprima}</p>
                    <Segmentato
                      etichetta={t.anteprima}
                      valore={s.quiz_progressivo ? "progressiva" : "intera"}
                      onChange={(v) => upd({ quiz_progressivo: v === "progressiva" })}
                      testId="quiz-anteprima"
                      opzioni={[
                        ["intera", t.intera],
                        ["progressiva", t.progressiva],
                      ]}
                    />
                    <p className="text-sm muted">
                      {s.quiz_progressivo ? t.progressivaAiuto : t.interaAiuto}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[1.05rem] font-extrabold">{t.dipartenza}</p>
                    <Segmentato
                      etichetta={t.dipartenza}
                      valore={s.quiz_loop ? "loop" : "una"}
                      onChange={(v) => upd({ quiz_loop: v === "loop" })}
                      testId="quiz-loop"
                      opzioni={[
                        ["loop", t.loop],
                        ["una", t.unaVolta],
                      ]}
                    />
                    <p className="text-sm muted">{t.loopAiuto}</p>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <label htmlFor="quiz-tempo-input" className="text-[1.05rem] font-extrabold">
                  {t.tempoRisposta}
                </label>
                <input
                  id="quiz-tempo-input"
                  className="field block w-36 text-xl"
                  value={tempo}
                  inputMode="numeric"
                  onChange={(e) => setTempo(e.target.value)}
                  onBlur={() => {
                    const v = leggiTempo(tempo, 10, 600);
                    if (v !== null) upd({ quiz_tempo: v });
                    setTempo(mmss(v ?? s.quiz_tempo));
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  data-testid="quiz-tempo-input"
                />
                <p className="text-sm muted">{t.tempoAiuto}</p>
              </div>
            </Sezione>

            {conSigle && (
              <Sezione titolo={t.punteggio}>
                <div className="space-y-2">
                  <p className="text-[1.05rem] font-extrabold">{t.indovinano}</p>
                  <Segmentato
                    etichetta={t.indovinano}
                    valore={s.quiz_chiede}
                    onChange={(v) => upd({ quiz_chiede: v })}
                    testId="quiz-chiede"
                    opzioni={CHIEDE.map((c) => [c, t.chiede[c]] as const)}
                  />
                  <p className="text-sm muted">{t.chiedeAiuto[s.quiz_chiede]}</p>
                </div>
              </Sezione>
            )}

            <div className="flex justify-end">
              <button
                className="btn btn-primary px-8"
                onClick={onChiudi}
                data-testid="quiz-impostazioni-fatto"
              >
                {t.fatto}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
