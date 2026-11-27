"use client";

import Icon from "@/components/Icon";
import { useEffect, useState } from "react";
import { fmt } from "@/components/duello/DuelloBoard";
import ImpostazioniQuiz from "@/components/quiz/ImpostazioniQuiz";
import it from "@/i18n/it.json";
import { BOSSES } from "@/lib/raid";
import type { RoomSettings, RoomView } from "@/lib/messages";
import type { RoomSocket } from "@/lib/ws";

export default function Lobby({
  room,
  me,
  socket,
}: {
  room: RoomView;
  me: string;
  socket: RoomSocket;
}) {
  const isHost = room.host_id === me;
  const [s, setS] = useState<RoomSettings>(room.settings);
  const [copied, setCopied] = useState(false);
  const [imp, setImp] = useState(false);
  // arrivando dal pulsante «Quiz musicale con gli amici» della home: si parte già in modalità quiz
  useEffect(() => {
    if (room.host_id !== me || new URLSearchParams(window.location.search).get("modo") !== "quiz")
      return;
    if (room.settings.modalita !== "quiz") {
      const next = { ...room.settings, modalita: "quiz" as const, quiz_tipo: "sigla" as const };
      setS(next);
      socket.send({ type: "update_settings", settings: next });
    }
    setImp(true);
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const upd = (patch: Partial<RoomSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    socket.send({ type: "update_settings", settings: next });
  };
  const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const num = (v: string, d: number) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);
  return (
    <section className="space-y-5 pt-6">
      {/* il biglietto d'invito: carta stampata, una casella per lettera, bordo perforato */}
      <div className="su-carta biglietto reveal relative mx-auto max-w-2xl -rotate-1 border-2 border-black bg-carta p-5 text-center text-nero sm:p-7">
        <i
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-2"
          style={{
            backgroundImage: "radial-gradient(circle at 6px 0, #0e0d10 4px, transparent 4.5px)",
            backgroundSize: "12px 8px",
          }}
        />
        <span className="text-xs font-black uppercase tracking-[0.25em] text-[#b3200f]">
          {it.stanza.lobby}
        </span>
        <h2 className="mt-2 not-italic">
          <span
            data-testid="room-code"
            className="num inline-flex gap-1.5 text-5xl sm:gap-2.5 sm:text-7xl"
            aria-label={room.code}
          >
            {room.code.split("").map((ch, i) => (
              <span
                key={i}
                className="colpo grid w-[1.25em] place-items-center border-2 border-black bg-white/60 py-1 shadow-[3px_3px_0_#000]"
                style={{ ["--i" as string]: i }}
              >
                {ch}
              </span>
            ))}
          </span>
        </h2>
        <p className="mt-3 text-sm font-bold muted">{it.stanza.condividi}</p>
        <button
          className="btn btn-primary mt-3"
          onClick={() => {
            void navigator.clipboard?.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
        >
          <Icon name={copied ? "check" : "link"} />
          {copied ? it.stanza.copiato : it.stanza.copiaLink}
        </button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={it.stanza.giocatori}>
        {room.players.map((p, i) => (
          <li
            key={p.id}
            data-testid="player"
            className="panel-vivo reveal flex items-center gap-3 p-3.5"
            style={{ ["--i" as string]: i }}
          >
            <span
              className="grid size-11 shrink-0 place-items-center -rotate-3 border-2 border-black text-lg font-black text-black/70"
              style={{ background: p.color }}
            >
              {p.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-bold">{p.name}</span>
              <span className="block text-xs muted">
                {p.id === room.host_id && (
                  <>
                    <Icon name="crown" /> {it.stanza.host}{" "}
                  </>
                )}
                {!p.connected && <>({it.stanza.assente})</>}
              </span>
            </span>
          </li>
        ))}
        {room.players.length < 4 &&
          Array.from({ length: 4 - room.players.length }, (_, i) => (
            <li
              key={`vuoto-${i}`}
              aria-hidden="true"
              className="flex items-center gap-3 border-2 border-dashed border-[var(--line-forte)] p-3.5 text-sm font-bold text-white/40"
            >
              <span className="grid size-11 place-items-center border-2 border-dashed border-[var(--line-forte)]">
                <Icon name="plus" />
              </span>
              {it.stanza.postoLibero}
            </li>
          ))}
      </ul>
      {isHost ? (
        <div className="panel grid gap-3 p-5 sm:grid-cols-3">
          <h3 className="text-3xl sm:col-span-3">{it.stanza.regole}</h3>
          <label className="grid gap-1 text-sm font-bold">
            {it.stanza.modalita}
            <select
              aria-label={it.stanza.modalita}
              className="field"
              value={s.modalita}
              onChange={(e) => {
                upd({ modalita: e.target.value as RoomSettings["modalita"] });
                // scegliendo il quiz si apre subito la finestra delle impostazioni
                if (e.target.value === "quiz") setImp(true);
              }}
            >
              <option value="asta">{it.stanza.modAsta}</option>
              <option value="specchio">{it.stanza.modSpecchio}</option>
              <option value="raid">{it.raid.modRaid}</option>
              <option value="quiz">{it.quiz.modQuiz}</option>
            </select>
          </label>
          {s.modalita === "quiz" ? (
            <div className="space-y-3 sm:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-black/20 p-4">
                <ul className="flex flex-wrap gap-2" data-testid="quiz-riepilogo">
                  <li className="chip">{it.quiz.stanza.tipi[s.quiz_tipo]}</li>
                  <li className="chip">
                    {fmt(it.quiz.imp.riepilogo, { r: s.quiz_round, t: mmss(s.quiz_tempo) })}
                  </li>
                  {(s.quiz_tipo === "sigla" || s.quiz_tipo === "misto") && (
                    <li className="chip">
                      {it.quiz.imp.chiede[s.quiz_chiede]} · {s.quiz_clip}s ·{" "}
                      {s.quiz_progressivo ? it.quiz.imp.progressiva : it.quiz.imp.intera} ·{" "}
                      {s.quiz_loop ? it.quiz.imp.loop : it.quiz.imp.unaVolta}
                    </li>
                  )}
                </ul>
                <button
                  className="btn"
                  onClick={() => setImp(true)}
                  data-testid="quiz-impostazioni"
                >
                  <Icon name="dots" className="size-[1.1em]" /> {it.quiz.imp.apri}
                </button>
              </div>
              <p className="text-sm muted">{it.quiz.stanza.spiega}</p>
            </div>
          ) : (
            <>
              <label className="grid gap-1 text-sm font-bold">
                {it.stanza.budget}
                <input
                  aria-label={it.stanza.budget}
                  className="field"
                  type="number"
                  value={s.budget}
                  onChange={(e) => upd({ budget: num(e.target.value, 50) })}
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                {it.stanza.timer}
                <input
                  aria-label={it.stanza.timer}
                  className="field"
                  type="number"
                  value={s.timer}
                  onChange={(e) => upd({ timer: num(e.target.value, 10) })}
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                {it.stanza.timerRuolo}
                <input
                  aria-label={it.stanza.timerRuolo}
                  className="field"
                  type="number"
                  value={s.role_timeout}
                  onChange={(e) => upd({ role_timeout: num(e.target.value, 8) })}
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                {it.stanza.timerPiano}
                <input
                  aria-label={it.stanza.timerPiano}
                  className="field"
                  type="number"
                  min={0}
                  max={180}
                  value={s.plan_timeout}
                  onChange={(e) => upd({ plan_timeout: num(e.target.value, 45) })}
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                {it.stanza.formato}
                <select
                  aria-label={it.stanza.formato}
                  className="field"
                  value={s.formato}
                  onChange={(e) => upd({ formato: e.target.value as RoomSettings["formato"] })}
                >
                  <option value="girone">{it.stanza.fmtGirone}</option>
                  <option value="eliminazione">{it.stanza.fmtElim}</option>
                </select>
              </label>
              {s.modalita !== "raid" && (
                <label className="grid gap-1 text-sm font-bold">
                  {it.stanza.combattimento}
                  <select
                    aria-label={it.stanza.combattimento}
                    className="field"
                    value={s.regole}
                    onChange={(e) => upd({ regole: e.target.value as RoomSettings["regole"] })}
                    data-testid="regole"
                  >
                    <option value="classico">{it.stanza.combClassico}</option>
                    <option value="duello">{it.stanza.combDuello}</option>
                  </select>
                </label>
              )}
              {s.modalita !== "raid" && s.regole === "duello" && (
                <label className="grid gap-1 text-sm font-bold">
                  {it.stanza.turnoDuello}
                  <input
                    aria-label={it.stanza.turnoDuello}
                    type="number"
                    min={10}
                    max={90}
                    className="field"
                    value={s.turno_duello}
                    onChange={(e) => upd({ turno_duello: num(e.target.value, 30) })}
                  />
                </label>
              )}
              {s.modalita === "raid" && (
                <>
                  <label className="grid gap-1 text-sm font-bold">
                    {it.raid.boss}
                    <select
                      aria-label={it.raid.boss}
                      className="field"
                      value={s.boss}
                      onChange={(e) => upd({ boss: e.target.value })}
                    >
                      {BOSSES.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-bold">
                    {it.raid.difficoltaTitolo}
                    <select
                      aria-label={it.raid.difficoltaTitolo}
                      className="field"
                      value={s.difficolta}
                      onChange={(e) =>
                        upd({ difficolta: e.target.value as RoomSettings["difficolta"] })
                      }
                    >
                      {(["normale", "difficile", "epico"] as const).map((d) => (
                        <option key={d} value={d}>
                          {it.raid.difficolta[d]}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {s.modalita !== "asta" && (
                <label className="grid gap-1 text-sm font-bold">
                  {it.stanza.tempoScelta}
                  <input
                    aria-label={it.stanza.tempoScelta}
                    className="field"
                    type="number"
                    min={5}
                    max={120}
                    value={s.pick_timeout}
                    onChange={(e) => upd({ pick_timeout: num(e.target.value, 20) })}
                  />
                </label>
              )}
              <label className="grid gap-1 text-sm font-bold">
                {it.stanza.ban}
                <input
                  aria-label={it.stanza.ban}
                  className="field"
                  type="number"
                  min={0}
                  max={3}
                  value={s.bans_per_player}
                  onChange={(e) =>
                    upd({ bans_per_player: Math.min(3, Math.max(0, num(e.target.value, 0))) })
                  }
                />
              </label>
            </>
          )}
          <button
            className="btn btn-primary text-lg sm:col-span-3"
            disabled={room.players.length < 2}
            onClick={() => socket.send({ type: "start" })}
          >
            {s.modalita === "quiz"
              ? it.quiz.stanza.avviaQuiz
              : s.modalita === "specchio"
                ? it.stanza.avviaDraft
                : s.modalita === "raid"
                  ? it.stanza.avviaRaid
                  : it.stanza.avvia}
          </button>
          {room.players.length < 2 && (
            <p className="text-center text-sm muted sm:col-span-3" data-testid="lobby-attesa">
              {fmt(it.stanza.attendiGiocatori, { n: room.players.length })}
            </p>
          )}
        </div>
      ) : (
        <p>{it.stanza.attendiHost}</p>
      )}
      {isHost && <ImpostazioniQuiz s={s} upd={upd} aperto={imp} onChiudi={() => setImp(false)} />}
    </section>
  );
}
