"use client";

import Caricamento from "@/components/Caricamento";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Binder from "@/components/album/Binder";
import DuelloCard, { DuelloTile } from "@/components/duello/DuelloCard";
import { fmt } from "@/components/duello/DuelloBoard";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { riepilogoMazzo, type AlbumOut, type MazzoPersonale } from "@/lib/album";
import { useProfile } from "@/lib/profile";

export default function AlbumView() {
  const { profile, loading } = useProfile();
  const [album, setAlbum] = useState<AlbumOut | null>(null);
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

  if (loading) return <Caricamento titolo={it.seo.album.h1} />;
  if (!profile)
    return (
      <main className="mx-auto max-w-md p-6 pt-14 text-center">
        <div className="vuoto">
          <Icon name="cards" className="size-10" />
          <p className="font-bold text-carta">{it.album.senzaProfilo}</p>
          <Link href="/profilo" className="btn btn-primary">
            {it.nav.profilo}
          </Link>
        </div>
      </main>
    );
  if (!album) return <Caricamento titolo={it.seo.album.h1} testo={errore ?? undefined} />;

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 pt-6" data-testid="album">
      <header className="testata space-y-1">
        <span className="eyebrow">{fmt(it.nav.ciao, { nome: profile.name })}</span>
        <h1 className="text-4xl sm:text-5xl">{it.album.titolo}</h1>
        <div className="flex max-w-xl flex-wrap items-center gap-x-4 gap-y-1.5">
          <p className="text-sm font-bold text-carta" data-testid="album-conta">
            {fmt(it.album.possiedi, { n: album.posseduti, tot: album.totale })}
          </p>
          <div className="barra min-w-[8rem] flex-1" aria-hidden="true">
            <i style={{ width: `${(album.posseduti / Math.max(1, album.totale)) * 100}%` }} />
          </div>
          <span className="num text-sm text-[var(--accent)]">
            {Math.round((album.posseduti / Math.max(1, album.totale)) * 100)}%
          </span>
        </div>
      </header>

      {mazzo && r && (
        <p
          className="panel flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium"
          data-testid="mazzo-striscia"
        >
          <span>
            <b>{mazzo.nome}</b> · {mazzo.carte.length}/{album.limiti.mazzo}
          </span>
          <span className="muted">{it.album.aggiungi}</span>
          <a href="#mazzi" className="inline-flex min-h-9 items-center font-bold underline">
            {it.album.gestisciMazzi}
          </a>
        </p>
      )}
      <Binder
        carte={album.carte}
        inMazzo={new Set(mazzo?.carte ?? [])}
        onCarta={(c) => (c.posseduta && mazzo ? toggle(c.carta.id) : setAperta(c.carta.id))}
        onDettaglio={(c) => setAperta(c.carta.id)}
      />
      {mazzo && (
        <div
          className="panel panel-solido sticky bottom-[3.75rem] z-30 flex items-center gap-3 p-2 sm:bottom-2"
          data-testid="vassoio"
        >
          <span className="shrink-0 pl-1 text-xs font-black leading-tight">
            <span className="block max-w-[6.5rem] truncate uppercase tracking-wide">
              {mazzo.nome}
            </span>
            <span className="num text-base text-[var(--accent)]">
              {mazzo.carte.length}/{album.limiti.mazzo}
            </span>
          </span>
          <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5">
            {Array.from({ length: album.limiti.mazzo }, (_, i) => {
              const c = album.carte.find((x) => x.carta.id === mazzo.carte[i]);
              return (
                <li
                  key={i}
                  className={`num relative grid size-11 shrink-0 place-items-center overflow-hidden text-xs text-white/30 ${
                    c ? "border-2 border-carta" : "border-[1.5px] border-dashed border-white/30"
                  }`}
                >
                  {!c && i + 1}
                  {c?.carta.immagine_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.carta.immagine_url}
                      alt={c.carta.nome}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 size-full object-cover object-top"
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <button className="btn btn-primary shrink-0" onClick={() => void salva()}>
            {it.album.salva}
          </button>
        </div>
      )}
      <section className="panel space-y-3 p-4" id="mazzi" data-testid="mazzi">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-3xl">{it.album.mazzi}</h2>
          <button
            className="btn"
            disabled={mazzi.length >= album.limiti.mazzi}
            onClick={() => {
              setMazzi([...mazzi, { nome: `Mazzo ${mazzi.length + 1}`, carte: [] }]);
              setSel(mazzi.length);
            }}
            data-testid="nuovo-mazzo"
          >
            <Icon name="plus" /> {it.album.nuovoMazzo}
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
          <p className="vuoto text-sm font-bold">{it.album.nessunMazzo}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {mazzi.map((m, i) => (
                <button key={i} className="btn" aria-pressed={i === sel} onClick={() => setSel(i)}>
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
                <p className="text-sm font-bold" data-testid="mazzo-stato">
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
          {msg && <span className="chip border-black bg-[#35d68a] text-black">{msg}</span>}
          {errore && (
            <span role="alert" className="text-rose-400">
              {errore}
            </span>
          )}
        </div>
      </section>

      {aperta && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4"
          onClick={() => setAperta(null)}
        >
          <div className="w-64 max-w-full">
            <DuelloCard carta={album.carte.find((c) => c.carta.id === aperta)!.carta} />
            <p className="mt-4 text-center text-sm font-bold">
              {album.carte.find((c) => c.carta.id === aperta)?.posseduta
                ? it.album.posseduta
                : it.album.nonPosseduta}
            </p>
            <button className="btn mt-3 w-full" onClick={() => setAperta(null)}>
              {it.duello.chiudi}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
