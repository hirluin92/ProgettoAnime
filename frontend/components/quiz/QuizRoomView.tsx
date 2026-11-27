"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { fmt } from "@/components/duello/DuelloBoard";
import Icon, { Medaglia } from "@/components/Icon";
import AnimeSearch from "@/components/quiz/AnimeSearch";
import Ascolto from "@/components/quiz/Ascolto";
import it from "@/i18n/it.json";
import type { RoomView } from "@/lib/messages";
import { FONTI } from "@/lib/quiz";
import { useRoom } from "@/lib/store";
import type { RoomSocket } from "@/lib/ws";

const ZOOM = [5, 3.8, 2.8, 2, 1.5, 1.2];
const SFOCA = [5, 3.5, 2, 1, 0, 0];
const ETICHETTE = { ...it.quiz.indizi, ...it.quiz.indiziAnime } as Record<string, string>;
const RUOLI: Record<string, string> = {
  MAIN: "Principale",
  SUPPORTING: "Secondario",
  BACKGROUND: "Comparsa",
};
const GENERI: Record<string, string> = { Male: "Maschio", Female: "Femmina" };

function valore(k: string, v: string) {
  if (k === "fonte") return FONTI[v] ?? v;
  if (k === "ruolo") return RUOLI[v] ?? v;
  if (k === "genere") return GENERI[v] ?? v;
  return v;
}

/** La fase «quiz» di una stanza: domande a tempo, si vince rispondendo giusto e prima. */
export default function QuizRoomView({
  room,
  me,
  socket,
}: {
  room: RoomView;
  me: string;
  socket: RoomSocket;
}) {
  const q = room.quiz!;
  const offset = useRoom((s) => s.offset);
  const esito = useRoom((s) => s.quizEsito);
  const errore = useRoom((s) => s.error);
  const codice = useRoom((s) => s.errorCode);
  const [adesso, setAdesso] = useState(() => Date.now() / 1000);
  const nome = (id: string) => room.players.find((p) => p.id === id)?.name ?? "?";
  const sono = q.punteggi.find((p) => p.id === me);
  const isHost = room.host_id === me;

  useEffect(() => {
    const t = setInterval(() => setAdesso(Date.now() / 1000), 200);
    return () => clearInterval(t);
  }, []);

  const resto = Math.max(0, q.scadenza - (adesso + offset));
  const durata = q.fase === "domanda" ? room.settings.quiz_tempo : 6;
  const blocco =
    esito && !esito.giusto ? Math.max(0, esito.blocco - (Date.now() - esito.at) / 1000) : 0;
  const bloccato = blocco > 0 && q.fase === "domanda";
  const chiusa = q.fase !== "domanda";
  const ritratto = q.kind === "personaggio";
  const livello = chiusa ? 5 : q.livello;
  const zoom = chiusa ? 1 : ZOOM[livello];
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(false);
  useEffect(() => setMsg(null), [q.round]);
  useEffect(() => {
    if (codice === "locked" || codice === "done" || codice === "closed") setMsg(errore);
  }, [errore, codice]);
  useEffect(() => {
    setMsgOk(!!esito?.giusto);
    if (esito?.giusto)
      setMsg(
        fmt(it.quiz.stanza.parzialeGiusto, {
          cosa: it.quiz.stanza.tipoRisposta[esito.componente as "anime" | "brano" | "artista"],
          n: esito.punti,
        }),
      );
    else if (esito)
      setMsg(esito.stessa_serie ? it.quiz.stanza.serieGiusta : it.quiz.stanza.sbagliata);
  }, [esito]);

  // cosa ho già indovinato in questa domanda (la risposta principale è `giusto`)
  const fatto = (k: string) =>
    k === q.principale ? !!sono?.giusto : k === "brano" ? !!sono?.brano : !!sono?.artista;
  const classifica = useMemo(() => q.punteggi, [q.punteggi]);
  const podio = classifica.slice(0, 3);

  return (
    <section className="space-y-4" data-testid="quiz-stanza">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">
            {fmt(it.quiz.stanza.domanda, { n: q.round, tot: q.totali })} ·{" "}
            {it.quiz.stanza.tipi[q.kind]}
          </span>
          <h2 className="display text-4xl font-black">
            {q.fase === "fine" ? it.quiz.stanza.fine : it.quiz.stanza.titolo[q.kind]}
          </h2>
        </div>
        {q.fase !== "fine" && (
          <div className="w-full max-w-xs space-y-1 text-right sm:w-72">
            <div className="display text-4xl font-black tabular-nums" data-testid="quiz-tempo">
              {Math.ceil(resto)}s
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${chiusa ? "bg-white/30" : "bg-gradient-to-r from-cyan-300 to-pink-500"}`}
                style={{ width: `${Math.min(100, (resto / durata) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="space-y-3">
          <AnimatePresence>
            {q.fase === "rivelazione" && q.soluzione && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="panel flex flex-wrap items-center gap-4 p-4"
                data-testid="quiz-soluzione"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={q.soluzione.immagine}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-28 rounded-xl border-2 border-white/30"
                />
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">{it.quiz.stanza.eraQuesto}</p>
                  <p className="text-2xl font-extrabold">{q.soluzione.nome}</p>
                  <p className="muted">{q.soluzione.dettaglio}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {q.fase !== "fine" && (
            <div className="panel space-y-3 p-4">
              {q.immagine ? (
                <div
                  className={`relative mx-auto overflow-hidden rounded-2xl border-2 border-white/25 bg-black ${
                    ritratto ? "aspect-[3/4] max-h-[26rem]" : "aspect-[19/6] w-full"
                  }`}
                  data-testid="quiz-immagine"
                  data-livello={livello}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={q.immagine}
                    alt=""
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="absolute inset-0 size-full select-none object-cover"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: `${q.fx}% ${q.fy}%`,
                      filter: `blur(${chiusa ? 0 : SFOCA[livello]}px)`,
                      transition: "transform 0.9s cubic-bezier(0.22,1,0.36,1), filter 0.9s ease",
                    }}
                  />
                </div>
              ) : q.audio ? (
                <Ascolto
                  src={q.audio}
                  livello={livello}
                  intero={chiusa}
                  autoplay
                  tetto={q.audio_secondi || undefined}
                  loopIniziale={q.loop}
                />
              ) : (
                <p className="text-center text-sm muted">{it.quiz.stanza.soloIndizi}</p>
              )}
              {q.indizi.length > 0 && (
                <ul className="flex flex-wrap justify-center gap-2" data-testid="quiz-indizi">
                  {q.indizi.map((i) => (
                    <motion.li
                      key={i.k}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="chip px-3 py-1 text-[0.9rem]"
                    >
                      <b className="text-cyan-200">{ETICHETTE[i.k] ?? i.k}:</b> {valore(i.k, i.v)}
                    </motion.li>
                  ))}
                </ul>
              )}
              {q.kind === "sigla" && !chiusa && (
                <ul className="flex flex-wrap justify-center gap-2" data-testid="quiz-componenti">
                  {q.tipi
                    .map((k) => [k, fatto(k)] as const)
                    .map(([k, fatto]) => (
                      <li
                        key={k}
                        className={`chip px-3 py-1 ${fatto ? "text-emerald-300" : "muted"}`}
                        data-fatto={fatto}
                      >
                        {fatto && <Icon name="check" className="size-3.5" />}
                        {(it.quiz.stanza.tipoRisposta as Record<string, string>)[k]}
                      </li>
                    ))}
                </ul>
              )}
              {!chiusa && q.tipi.some((k) => !fatto(k)) && (
                <div className="space-y-1">
                  <AnimeSearch
                    onScegli={(a) =>
                      socket.send({
                        type: "quiz_risposta",
                        risposta_id: a.id,
                        tipo: a.tipo ?? "anime",
                      })
                    }
                    personaggi={ritratto}
                    sigle={q.kind === "sigla"}
                    tipi={q.tipi}
                    disabilitato={bloccato}
                    testId="quiz-cerca"
                  />
                  {bloccato && (
                    <p className="text-sm text-amber-200">
                      {fmt(it.quiz.stanza.blocco, { n: Math.ceil(blocco) })}
                    </p>
                  )}
                  {!bloccato && msg && (
                    <p
                      className={`text-sm ${msgOk ? "text-emerald-300" : "text-amber-200"}`}
                      role="status"
                      data-testid="quiz-msg"
                    >
                      {msg}
                    </p>
                  )}
                </div>
              )}
              {!chiusa && sono?.giusto && (
                <p
                  className="text-center text-xl font-extrabold text-emerald-300"
                  data-testid="quiz-giusto"
                >
                  {fmt(it.quiz.stanza.indovinato, { n: sono.guadagno })}
                </p>
              )}
            </div>
          )}

          {q.fase === "fine" && (
            <div className="panel space-y-4 p-6 text-center" data-testid="quiz-podio">
              <ol className="flex flex-wrap items-end justify-center gap-4">
                {podio.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex flex-col items-center gap-1 rounded-2xl border bg-white/[0.05] px-6 py-4"
                    style={{ minHeight: `${9 - i * 1.4}rem` }}
                  >
                    <Medaglia pos={i} />
                    <span className="display text-2xl font-black">{nome(p.id)}</span>
                    <span className="display text-4xl font-black text-gold">{p.punti}</span>
                  </li>
                ))}
              </ol>
              {isHost ? (
                <button
                  className="btn btn-primary"
                  onClick={() => socket.send({ type: "quiz_lobby" })}
                  data-testid="quiz-lobby"
                >
                  {it.quiz.stanza.rigioca}
                </button>
              ) : (
                <p className="text-sm muted">{it.quiz.stanza.attendiHost}</p>
              )}
            </div>
          )}
        </div>

        <aside className="panel space-y-2 p-4" data-testid="quiz-classifica">
          <h3 className="eyebrow">{it.quiz.stanza.classifica}</h3>
          <ol className="space-y-1.5">
            {classifica.map((p, i) => (
              <li
                key={p.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  p.id === me ? "border-cyan-300/50 bg-cyan-300/10" : "bg-white/[0.03]"
                }`}
              >
                <Medaglia pos={i} />
                <span className="min-w-0 flex-1 truncate font-bold">{nome(p.id)}</span>
                {p.serie >= 2 && (
                  <span
                    className="chip text-orange-300"
                    title={fmt(it.quiz.stanza.serieDi, { n: p.serie })}
                    data-testid="quiz-serie"
                  >
                    <Icon name="flame" className="size-3.5" />×{p.serie}
                  </span>
                )}
                {p.guadagno > 0 && q.fase !== "fine" && (
                  <span className="chip text-emerald-300">
                    <Icon name="check" className="size-3.5" />+{p.guadagno}
                  </span>
                )}
                <span className="display text-xl font-black tabular-nums">{p.punti}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}
