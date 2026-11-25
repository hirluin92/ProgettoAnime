"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CharacterCard from "@/components/battle/CharacterCard";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { APP_NAME } from "@/lib/constants";
import { saveToken } from "@/lib/ws";

const HERO: Parameters<typeof CharacterCard>[0]["character"][] = [
  {
    nome: "Monkey D. Luffy",
    anime: "one-piece",
    tags: ["MELEE", "TRANSFORM", "GIANT"],
    rating: 93,
  },
  { nome: "Satoru Gojo", anime: "jujutsu-kaisen", tags: ["BARRIER", "ENERGY", "AURA"], rating: 97 },
  {
    nome: "Tanjiro Kamado",
    anime: "demon-slayer",
    tags: ["MELEE", "ELEMENT", "SPEED"],
    rating: 84,
  },
];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [streamer, setStreamer] = useState(false);
  const [channel, setChannel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    try {
      const r = await api<{ code: string; token: string }>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ name, streamer_channel: streamer ? channel : null }),
      });
      saveToken(r.code, r.token);
      router.push(`/stanza/${r.code}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const join = async () => {
    setError(null);
    try {
      await api(`/api/rooms/${code.trim().toUpperCase()}`);
      router.push(`/stanza/${code.trim().toUpperCase()}`);
    } catch {
      setError(it.errori.stanzaNonTrovata);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-8">
          <header className="space-y-4">
            <span className="chip text-cyan-200">⚔ Aste live · Draft · Tornei</span>
            <h1 className="text-6xl font-bold leading-[0.95] sm:text-7xl">
              <span className="text-grad">{APP_NAME}</span>
            </h1>
            <p className="max-w-md text-lg muted">{it.home.sottotitolo}</p>
          </header>

          <section className="panel space-y-3 p-5">
            <h2 className="text-xl font-bold">{it.home.titolo}</h2>
            <input
              aria-label={it.home.tuoNome}
              placeholder={it.home.tuoNome}
              className="field w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm muted">
              <input
                type="checkbox"
                className="h-4 w-4 accent-pink-500"
                checked={streamer}
                onChange={(e) => setStreamer(e.target.checked)}
              />
              {it.home.stanzaStreamer}
            </label>
            {streamer && (
              <input
                aria-label={it.home.canale}
                placeholder={it.home.canale}
                className="field w-full"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              />
            )}
            <button
              className="btn btn-primary w-full text-lg"
              disabled={!name.trim() || (streamer && !channel.trim())}
              onClick={create}
            >
              {it.home.creaStanza}
            </button>
            <div className="flex gap-2 pt-1">
              <input
                aria-label={it.home.codice}
                placeholder={it.home.codice}
                maxLength={5}
                className="field min-w-0 flex-1 text-center uppercase tracking-[0.3em]"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button className="btn" disabled={code.trim().length < 5} onClick={join}>
                {it.home.entraCodice}
              </button>
            </div>
            {error && (
              <p role="alert" className="text-rose-400">
                {error}
              </p>
            )}
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/veloce"
              className="panel group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-white/30"
            >
              <span className="text-3xl">⚡</span>
              <span className="font-bold leading-snug">{it.home.partitaVeloce}</span>
            </Link>
            <Link
              href="/sfida"
              className="panel group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-white/30"
            >
              <span className="text-3xl">🏆</span>
              <span className="font-bold leading-snug">{it.home.sfidaGiorno}</span>
            </Link>
          </div>
        </div>

        <div
          className="relative mx-auto hidden h-[430px] w-full max-w-[460px] lg:block"
          aria-hidden="true"
        >
          <div className="absolute inset-x-6 top-10 h-72 rounded-full bg-fuchsia-600/30 blur-3xl" />
          <div className="absolute left-0 top-16 -rotate-[10deg]">
            <CharacterCard character={HERO[2]} role="Danno" />
          </div>
          <div className="absolute right-0 top-14 rotate-[9deg]">
            <CharacterCard character={HERO[0]} role="Capitano" />
          </div>
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <CharacterCard character={HERO[1]} role="Supporto" />
          </div>
        </div>
      </div>
    </main>
  );
}
