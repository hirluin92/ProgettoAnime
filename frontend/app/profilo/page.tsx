"use client";

import Caricamento from "@/components/Caricamento";
import Icon, { Medaglia } from "@/components/Icon";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import it from "@/i18n/it.json";
import AccountPanel from "@/components/AccountPanel";
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
  const [accesso, setAccesso] = useState(false);

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

  if (loading) return <Caricamento />;

  if (!profile && accesso)
    return (
      <main className="mx-auto max-w-md px-5 pt-14">
        <AccountPanel
          modo="accedi"
          onFatto={() => {
            setAccesso(false);
            void reload();
          }}
          onAltro={() => setAccesso(false)}
        />
      </main>
    );

  if (!profile)
    return (
      <main className="mx-auto max-w-md px-5 pt-14" data-testid="profilo-nuovo">
        <div className="panel-vivo reveal space-y-4 p-6 sm:p-8">
          <div className="testata space-y-1">
            <span className="eyebrow">{it.profilo.gioca}</span>
            <h1 className="text-5xl leading-none">{it.profilo.titolo}</h1>
            <p className="text-sm font-medium muted">{it.profilo.senzaProfilo}</p>
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
            <p role="alert" className="border-2 border-rose-400 bg-rose-400/10 p-2 text-sm font-bold text-rose-300">
              {error}
            </p>
          )}
          <button
            className="btn btn-primary min-h-14 w-full text-xl"
            disabled={!name.trim()}
            onClick={() => void save()}
          >
            {it.profilo.crea}
          </button>
          <button
            className="min-h-11 w-full text-center text-sm font-bold underline muted"
            onClick={() => setAccesso(true)}
            data-testid="ho-account"
          >
            {it.account.haiAccount}
          </button>
        </div>
      </main>
    );

  const pct = profile.partite ? Math.round((100 * profile.vittorie) / profile.partite) : 0;
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 pt-8" data-testid="profilo">
      {/* la tessera del giocatore: carta stampata, timbro del livello, numeri in fila */}
      <header className="su-carta reveal relative overflow-hidden border-2 border-black bg-carta text-nero shadow-[7px_7px_0_var(--rosso)]">
        <i
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-1/2"
          style={{
            backgroundImage: "radial-gradient(rgb(14 13 16 / 0.22) 1.3px, transparent 1.7px)",
            backgroundSize: "10px 10px",
            WebkitMaskImage: "linear-gradient(260deg, #000, transparent 80%)",
            maskImage: "linear-gradient(260deg, #000, transparent 80%)",
          }}
        />
        <div className="relative flex flex-wrap items-center gap-5 p-5 sm:p-6">
          <div className="grid size-24 shrink-0 -rotate-6 place-items-center rounded-[10px] border-[3px] border-black bg-[#e0301f] text-white shadow-[4px_4px_0_#000]">
            <div className="text-center">
              <div className="text-[0.6rem] font-black uppercase tracking-widest">
                {it.profilo.livello}
              </div>
              <div className="num text-5xl leading-none" data-testid="livello">
                {profile.livello}
              </div>
            </div>
          </div>
          <div className="min-w-[14rem] flex-1 space-y-2">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#b3200f]">
                {profile.titolo}
              </span>
              <h1 className="truncate text-5xl leading-none sm:text-6xl">{profile.name}</h1>
              {profile.username && (
                <p className="text-sm font-bold muted" data-testid="profilo-utente">
                  {it.account.protetto.replace("{nome}", profile.username)}
                </p>
              )}
            </div>
            <div
              className="h-4 overflow-hidden border-2 border-black bg-white/60"
              role="progressbar"
              aria-label={it.profilo.xp}
              aria-valuenow={Math.round(avanzamento(profile))}
            >
              <div
                className="h-full bg-[#e0301f] transition-[width] duration-700"
                style={{
                  width: `${avanzamento(profile)}%`,
                  backgroundImage:
                    "repeating-linear-gradient(115deg, rgb(0 0 0 / 0.25) 0 4px, transparent 4px 9px)",
                }}
              />
            </div>
            <p className="num text-xs" data-testid="xp">
              {profile.xp} / {profile.xp_prossimo} {it.profilo.xp}
            </p>
          </div>
        </div>
        <dl className="relative grid grid-cols-3 border-t-2 border-black bg-nero text-center text-carta sm:grid-cols-6">
          {[
            [it.profilo.partite, profile.partite, ""],
            [it.profilo.vittorie, profile.vittorie, "text-emerald-300"],
            [it.profilo.percentuale, `${pct}%`, ""],
            [it.profilo.scala, profile.best_scala, "text-cyan-300"],
            [it.profilo.elo, profile.elo, "text-[#b7a8ff]"],
            [it.profilo.crediti, profile.crediti, "text-amber-300"],
          ].map(([k, v, colore]) => (
            <div
              key={String(k)}
              className="border-b border-r border-[rgb(243_236_221/0.18)] px-2 py-3 sm:border-b-0"
            >
              <dt className="text-[0.6rem] font-black uppercase tracking-widest text-[#b5aea0]">
                {k}
              </dt>
              <dd className={`num text-2xl ${colore}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </header>
      {!profile.username && <AccountPanel modo="registra" onFatto={() => void reload()} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-3 p-5" data-testid="obiettivi">
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl">{it.profilo.obiettivi}</h2>
            <span className="chip border-black bg-[#ffd21f] text-black">{it.profilo.obiettivoXp}</span>
          </div>
          <ul className="grid gap-2">
            {profile.obiettivi.map((o) => (
              <li
                key={o.id}
                className={`flex items-center gap-3 border-2 p-3 ${
                  o.fatto
                    ? "border-[#35d68a] bg-[#35d68a]/10"
                    : "border-[var(--line)] bg-black/20"
                }`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center border-2 ${
                    o.fatto ? "-rotate-6 border-black bg-[#35d68a] text-black" : "border-white/40"
                  }`}
                >
                  {o.fatto && <Icon name="check" className="size-4" />}
                </span>
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
            <h2 className="text-3xl">{it.profilo.classifica}</h2>
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
          <ol className="text-sm">
            {(season?.top ?? []).map((r, i) => (
              <li
                key={`${r.name}-${i}`}
                className="riga"
                data-io={r.name === profile.name ? "" : undefined}
              >
                <Medaglia pos={i} />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="num text-base">{r.points}</span>
              </li>
            ))}
            {season && season.top.length === 0 && (
              <li className="vuoto font-bold">{it.profilo.nessuno}</li>
            )}
          </ol>
        </section>
      </div>

      <section className="panel space-y-4 p-5" data-testid="collezione">
        <div className="flex items-baseline justify-between">
          <h2 className="text-3xl">{it.profilo.collezione}</h2>
          <span className="num text-sm">
            <b data-testid="coll-count">{profile.collezione.length}</b> /{" "}
            {profile.collezione_totale}
          </span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(([anime, list]) => {
            const mie = list.filter((c) => owned.has(c.id)).length;
            const pal = paletteFor(anime);
            return (
              <li key={anime} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm font-extrabold">
                  <span>{pal.label}</span>
                  <span className="tabular-nums muted">
                    {mie}/{list.length}
                  </span>
                </div>
                <div className="barra" style={{ ["--accent" as string]: pal.from }}>
                  <i style={{ width: `${(mie / list.length) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/album" className="btn btn-primary">
          {it.profilo.apriAlbum}
        </Link>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t-2 border-dashed border-[var(--line-forte)] pb-4 pt-5">
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
