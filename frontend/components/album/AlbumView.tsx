"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DuelloCard, { DuelloTile } from "@/components/duello/DuelloCard";
import { fmt } from "@/components/duello/DuelloBoard";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { riepilogoMazzo, type AlbumOut, type MazzoPersonale, type Rarita } from "@/lib/album";
import { useProfile } from "@/lib/profile";

const RARITA: Rarita[] = ["comune", "rara", "epica", "leggendaria"];

export default function AlbumView() {
  const { profile, loading } = useProfile();
  const [album, setAlbum] = useState<AlbumOut | null>(null);
  const [anime, setAnime] = useState("");
  const [rar, setRar] = useState<Rarita | "">("");
  const [solo, setSolo] = useState(false);
  const [mazzi, setMazzi] = useState<MazzoPersonale[]>([]);
  const [sel, setSel] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [aperta, setAperta] = useState<string | null>(null);

  const carica = useCallback(async () => {
    if (!profile) return;
    const a = await api<AlbumOut>(`/api/album/${profile.id}`);
    setAlbum(a);
    setMazzi(a.mazzi);
  }, [profile]);
  useEffect(() => {
    carica().catch((e: Error) => setErrore(e.message));
  }, [carica]);

  const animeLista = useMemo(
    () => [...new Set((album?.carte ?? []).map((c) => c.carta.anime))],
    [album],
  );
  const visibili = (album?.carte ?? []).filter(
    (c) =>
      (!anime || c.carta.anime === anime) && (!rar || c.rarita === rar) && (!solo || c.posseduta),
  );
  const mazzo = mazzi[sel];
  const r = album && mazzo ? riepilogoMazzo(album.carte, mazzo.carte) : null;

  const toggle = (id: string) => {
    if (!album || !mazzo) return;
    const dentro = mazzo.carte.includes(id);
    if (!dentro && mazzo.carte.length >= album.limiti.mazzo) return;
    setMazzi(
      mazzi.map((m, i) =>
        i === sel
          ? { ...m, carte: dentro ? m.carte.filter((x) => x !== id) : [...m.carte, id] }
          : m,
      ),
    );
    setMsg(null);
  };
  const salva = async () => {
    if (!profile) return;
    setErrore(null);
    try {
      await api(`/api/album/${profile.id}/mazzi`, {
        method: "PUT",
        body: JSON.stringify({ mazzi }),
      });
      setMsg(it.album.salvato);
    } catch (e) {
      setErrore((e as Error).message);
    }
  };

  if (loading) return <main className="p-6">{it.stanza.connessione}</main>;
  if (!profile)
    return (
      <main className="mx-auto max-w-md p-6 pt-14 text-center">
        <p className="panel p-6">{it.album.senzaProfilo}</p>
      </main>
    );
  if (!album) return <main className="p-6">{errore ?? it.stanza.connessione}</main>;

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 pt-6" data-testid="album">
      <header className="space-y-1">
        <span className="eyebrow">{profile.name}</span>
        <h1 className="display text-4xl font-black">{it.album.titolo}</h1>
        <p className="text-sm muted" data-testid="album-conta">
          {fmt(it.album.possiedi, { n: album.posseduti, tot: album.totale })}
        </p>
      </header>

      <section className="panel space-y-3 p-4" data-testid="mazzi">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-extrabold">{it.album.mazzi}</h2>
          <button
            className="btn"
            disabled={mazzi.length >= album.limiti.mazzi}
            onClick={() => {
              setMazzi([...mazzi, { nome: `Mazzo ${mazzi.length + 1}`, carte: [] }]);
              setSel(mazzi.length);
            }}
            data-testid="nuovo-mazzo"
          >
            + {it.album.nuovoMazzo}
          </button>
        </div>
        <p className="text-xs muted">
          {fmt(it.album.regole, {
            mazzo: album.limiti.mazzo,
            leg: album.limiti.leggendarie,
            alte: album.limiti.epiche_o_meglio,
            costo: album.limiti.costo,
          })}
        </p>
        {mazzi.length === 0 ? (
          <p className="text-sm muted">{it.album.nessunMazzo}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {mazzi.map((m, i) => (
                <button
                  key={i}
                  className={`btn ${i === sel ? "btn-primary" : ""}`}
                  onClick={() => setSel(i)}
                >
                  {m.nome}
                </button>
              ))}
            </div>
            {mazzo && r && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label={it.album.nomeMazzo}
                    className="field"
                    maxLength={24}
                    value={mazzo.nome}
                    onChange={(e) =>
                      setMazzi(
                        mazzi.map((m, i) => (i === sel ? { ...m, nome: e.target.value } : m)),
                      )
                    }
                  />
                  <button
                    className="btn"
                    onClick={() => {
                      setMazzi(mazzi.filter((_, i) => i !== sel));
                      setSel(0);
                    }}
                  >
                    {it.album.elimina}
                  </button>
                </div>
                <p className="text-sm" data-testid="mazzo-stato">
                  {fmt(it.album.stato, {
                    n: mazzo.carte.length,
                    mazzo: album.limiti.mazzo,
                    costo: r.costo,
                    maxCosto: album.limiti.costo,
                    leg: r.leggendarie,
                    maxLeg: album.limiti.leggendarie,
                  })}
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {mazzo.carte.map((id) => {
                    const c = album.carte.find((x) => x.carta.id === id);
                    return c ? (
                      <DuelloTile
                        key={id}
                        carta={c.carta}
                        potenza={c.carta.potenza}
                        onClick={() => toggle(id)}
                      />
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn btn-primary"
            onClick={() => void salva()}
            data-testid="salva-mazzi"
          >
            {it.album.salva}
          </button>
          {msg && <span className="text-emerald-300">{msg}</span>}
          {errore && (
            <span role="alert" className="text-rose-400">
              {errore}
            </span>
          )}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <select
          aria-label={it.album.tuttiAnime}
          className="field"
          value={anime}
          onChange={(e) => setAnime(e.target.value)}
        >
          <option value="">{it.album.tuttiAnime}</option>
          {animeLista.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button className={`btn ${rar === "" ? "btn-primary" : ""}`} onClick={() => setRar("")}>
          {it.album.tutte}
        </button>
        {RARITA.map((x) => (
          <button
            key={x}
            className={`btn ${rar === x ? "btn-primary" : ""}`}
            onClick={() => setRar(x)}
          >
            {it.album.rarita[x]}
          </button>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={solo} onChange={(e) => setSolo(e.target.checked)} />
          {it.album.soloPossedute}
        </label>
      </section>

      <p className="text-xs muted">{it.album.aggiungi}</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visibili.map((c) => {
          const dentro = !!mazzo?.carte.includes(c.carta.id);
          return (
            <li
              key={c.carta.id}
              className={c.posseduta ? "" : "opacity-40 grayscale"}
              data-testid={c.posseduta ? "album-posseduta" : "album-mancante"}
            >
              <div className={dentro ? "ring-2 ring-emerald-400 rounded-2xl" : ""}>
                <DuelloCard
                  carta={c.carta}
                  onClick={() =>
                    c.posseduta && mazzo ? toggle(c.carta.id) : setAperta(c.carta.id)
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>
      {aperta && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setAperta(null)}
        >
          <div className="w-64">
            <DuelloCard carta={album.carte.find((c) => c.carta.id === aperta)!.carta} />
            <p className="mt-2 text-center text-sm">{it.album.nonPosseduta}</p>
          </div>
        </div>
      )}
    </main>
  );
}
