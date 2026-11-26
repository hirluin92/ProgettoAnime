"use client";

import { useEffect, useMemo, useState } from "react";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { paletteFor } from "@/lib/animePalette";
import {
  avanzamento,
  clearProfileId,
  creaProfilo,
  useProfile,
  type CollectionItem,
  type SeasonView,
} from "@/lib/profile";

export default function ProfiloPage() {
  const { profile, loading, reload } = useProfile();
  const [name, setName] = useState("");
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [season, setSeason] = useState<SeasonView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<CollectionItem[]>("/api/collection")
      .then(setItems)
      .catch(() => undefined);
    api<SeasonView>("/api/season")
      .then(setSeason)
      .catch(() => undefined);
  }, [profile?.partite]);
  useEffect(() => {
    if (profile) setName(profile.name);
  }, [profile]);

  const owned = useMemo(() => new Set(profile?.collezione ?? []), [profile]);
  const groups = useMemo(() => {
    const m = new Map<string, CollectionItem[]>();
    for (const c of items) m.set(c.anime, [...(m.get(c.anime) ?? []), c]);
    return [...m.entries()];
  }, [items]);

  const save = async () => {
    setError(null);
    try {
      await creaProfilo(name.trim());
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <main className="p-6">{it.stanza.connessione}</main>;

  if (!profile)
    return (
      <main className="mx-auto max-w-md px-5 pt-14" data-testid="profilo-nuovo">
        <div className="panel reveal space-y-4 p-6 sm:p-8">
          <div className="space-y-1">
            <span className="eyebrow">{it.profilo.gioca}</span>
            <h1 className="text-5xl font-black leading-none">{it.profilo.titolo}</h1>
            <p className="text-sm muted">{it.profilo.senzaProfilo}</p>
          </div>
          <input
            aria-label={it.profilo.nome}
            placeholder={it.profilo.nome}
            maxLength={24}
            className="field w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-rose-400">
              {error}
            </p>
          )}
          <button
            className="btn btn-primary w-full text-lg"
            disabled={!name.trim()}
            onClick={() => void save()}
          >
            {it.profilo.crea}
          </button>
        </div>
      </main>
    );

  const pct = profile.partite ? Math.round((100 * profile.vittorie) / profile.partite) : 0;
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 pt-8" data-testid="profilo">
      <header className="panel reveal flex flex-wrap items-center gap-5 p-5 sm:p-6">
        <div className="grid size-24 shrink-0 place-items-center rounded-full border-2 border-amber-300/70 bg-gradient-to-br from-amber-300/25 to-pink-500/25 shadow-[0_0_30px_rgb(255_212_90/0.3)]">
          <div className="text-center">
            <div className="text-[0.6rem] font-extrabold uppercase tracking-widest muted">
              {it.profilo.livello}
            </div>
            <div className="display text-5xl font-black leading-none" data-testid="livello">
              {profile.livello}
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <span className="eyebrow">{profile.titolo}</span>
            <h1 className="truncate text-5xl font-black leading-none">{profile.name}</h1>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-black/40"
            role="progressbar"
            aria-label={it.profilo.xp}
            aria-valuenow={Math.round(avanzamento(profile))}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-pink-500 transition-[width] duration-700"
              style={{ width: `${avanzamento(profile)}%` }}
            />
          </div>
          <p className="text-xs muted" data-testid="xp">
            {profile.xp} / {profile.xp_prossimo} {it.profilo.xp}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-center">
          {[
            [it.profilo.partite, profile.partite],
            [it.profilo.vittorie, profile.vittorie],
            [it.profilo.percentuale, `${pct}%`],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-2xl border bg-white/[0.04] px-4 py-2">
              <dt className="text-[0.6rem] font-extrabold uppercase tracking-widest muted">{k}</dt>
              <dd className="display text-3xl font-black">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-3 p-5" data-testid="obiettivi">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-extrabold">{it.profilo.obiettivi}</h2>
            <span className="text-xs muted">{it.profilo.obiettivoXp}</span>
          </div>
          <ul className="grid gap-2">
            {profile.obiettivi.map((o) => (
              <li
                key={o.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  o.fatto ? "border-emerald-300/50 bg-emerald-400/10" : "bg-white/[0.03]"
                }`}
              >
                <span className="text-xl">{o.fatto ? "✅" : "⬜"}</span>
                <span>
                  <b className="block">{o.nome}</b>
                  <span className="text-sm muted">{o.descrizione}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel space-y-3 p-5" data-testid="stagione">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-extrabold">{it.profilo.classifica}</h2>
            <span className="chip">{profile.stagione.id}</span>
          </div>
          <p className="text-sm">
            {it.profilo.stagione}: <b className="text-gold">{profile.stagione.punti}</b>
            {profile.stagione.posizione && (
              <>
                {" "}
                · {it.profilo.tuaPosizione}: <b>#{profile.stagione.posizione}</b>
              </>
            )}
          </p>
          <ol className="grid gap-1.5 text-sm">
            {(season?.top ?? []).map((r, i) => (
              <li
                key={`${r.name}-${i}`}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  r.name === profile.name ? "border-cyan-300/50 bg-cyan-300/10" : "bg-white/[0.03]"
                }`}
              >
                <span className="display w-7 text-xl font-black text-gold">
                  {["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">{r.name}</span>
                <span className="display text-xl font-black tabular-nums">{r.points}</span>
              </li>
            ))}
            {season && season.top.length === 0 && <li className="muted">{it.profilo.nessuno}</li>}
          </ol>
        </section>
      </div>

      <section className="panel space-y-4 p-5" data-testid="collezione">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-extrabold">{it.profilo.collezione}</h2>
          <span className="text-sm">
            <b data-testid="coll-count">{profile.collezione.length}</b> /{" "}
            {profile.collezione_totale}
          </span>
        </div>
        {groups.map(([anime, list]) => (
          <div key={anime}>
            <h3 className="mb-1.5 text-sm font-extrabold uppercase tracking-widest muted">
              {paletteFor(anime).label} · {list.filter((c) => owned.has(c.id)).length}/{list.length}
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {list.map((c) => (
                <li
                  key={c.id}
                  className={`rounded-lg border px-2 py-1 text-xs ${
                    owned.has(c.id)
                      ? "border-white/30 bg-white/10 font-bold"
                      : "border-dashed text-white/30"
                  }`}
                  title={owned.has(c.id) ? `${c.nome} · ${c.rating}` : it.profilo.bloccata}
                >
                  {owned.has(c.id)
                    ? `${c.nome}${c.forma ? ` (${c.forma})` : ""}`
                    : it.profilo.bloccata}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3 pb-4">
        <input
          aria-label={it.profilo.nome}
          className="field"
          maxLength={24}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn" disabled={!name.trim()} onClick={() => void save()}>
          {it.profilo.salva}
        </button>
        <button
          className="btn"
          onClick={() => {
            clearProfileId();
            void reload();
          }}
        >
          {it.profilo.esci}
        </button>
      </div>
    </main>
  );
}
