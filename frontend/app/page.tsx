"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { APP_NAME } from "@/lib/constants";
import { saveToken } from "@/lib/ws";

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
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-4xl font-black">{APP_NAME}</h1>
        <p className="mt-1 opacity-80">{it.home.sottotitolo}</p>
      </header>
      <section className="space-y-3 rounded-2xl border p-4">
        <h2 className="text-xl font-black">{it.home.titolo}</h2>
        <input
          aria-label={it.home.tuoNome}
          placeholder={it.home.tuoNome}
          className="min-h-11 w-full rounded border px-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={streamer}
            onChange={(e) => setStreamer(e.target.checked)}
          />
          {it.home.stanzaStreamer}
        </label>
        {streamer && (
          <input
            aria-label={it.home.canale}
            placeholder={it.home.canale}
            className="min-h-11 w-full rounded border px-3"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          />
        )}
        <button
          className="min-h-11 w-full rounded-xl bg-rose-600 font-bold text-white disabled:opacity-40"
          disabled={!name.trim() || (streamer && !channel.trim())}
          onClick={create}
        >
          {it.home.creaStanza}
        </button>
        <div className="flex gap-2">
          <input
            aria-label={it.home.codice}
            placeholder={it.home.codice}
            maxLength={5}
            className="min-h-11 flex-1 rounded border px-3 uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            className="min-h-11 rounded-xl border-2 px-4 font-bold disabled:opacity-40"
            disabled={code.trim().length < 5}
            onClick={join}
          >
            {it.home.entraCodice}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-rose-600">
            {error}
          </p>
        )}
      </section>
      <Link href="/veloce" className="flex min-h-11 items-center rounded-2xl border p-4 font-bold">
        {it.home.partitaVeloce}
      </Link>
    </main>
  );
}
