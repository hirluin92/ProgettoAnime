"use client";

import { useState } from "react";
import it from "@/i18n/it.json";
import { accedi, recupera, registra, saveProfileId } from "@/lib/profile";

type Modo = "registra" | "accedi" | "recupera";

/** Registrazione, accesso e recupero password (nome utente + password + codice di recupero). */
export default function AccountPanel({
  modo: iniziale,
  onFatto,
  onAltro,
}: {
  modo: Modo;
  onFatto: () => void;
  onAltro?: () => void;
}) {
  const [modo, setModo] = useState<Modo>(iniziale);
  const [utente, setUtente] = useState("");
  const [password, setPassword] = useState("");
  const [codice, setCodice] = useState("");
  const [nuovo, setNuovo] = useState<string | null>(null); // codice di recupero appena creato
  const [idDaSalvare, setIdDaSalvare] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const invia = async () => {
    setErrore(null);
    if (modo !== "accedi" && password.length < 8) {
      setErrore(it.account.passwordCorta);
      return;
    }
    setBusy(true);
    try {
      const out =
        modo === "registra"
          ? await registra(utente.trim(), password)
          : modo === "accedi"
            ? await accedi(utente.trim(), password)
            : await recupera(utente.trim(), codice.trim(), password);
      if (out.codice_recupero) {
        setNuovo(out.codice_recupero);
        if (modo === "recupera") setIdDaSalvare(out.profile.id);
      } else onFatto();
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (nuovo)
    return (
      <section className="panel space-y-3 p-5" data-testid="account-codice">
        <h2 className="text-2xl font-extrabold">{it.account.codiceTitolo}</h2>
        <p className="text-sm muted">{it.account.codiceTesto}</p>
        <p className="display text-grad text-center text-3xl font-black tracking-widest">{nuovo}</p>
        <div className="flex gap-2">
          <button
            className="btn flex-1"
            onClick={() => {
              void navigator.clipboard?.writeText(nuovo);
              setCopiato(true);
            }}
          >
            {copiato ? it.account.copiato : it.account.copia}
          </button>
          <button
            className="btn btn-primary flex-1"
            onClick={() => {
              if (idDaSalvare) saveProfileId(idDaSalvare);
              onFatto();
            }}
            data-testid="codice-ok"
          >
            {it.account.codiceSalvato}
          </button>
        </div>
      </section>
    );

  const titolo =
    modo === "registra"
      ? it.account.proteggi
      : modo === "accedi"
        ? it.account.accedi
        : it.account.dimenticata;
  return (
    <section className="panel space-y-3 p-5" data-testid={`account-${modo}`}>
      <h2 className="text-2xl font-extrabold">{titolo}</h2>
      {modo === "registra" && <p className="text-sm muted">{it.account.proteggiTesto}</p>}
      <input
        aria-label={it.account.utente}
        placeholder={it.account.utente}
        autoComplete="username"
        maxLength={20}
        className="field w-full"
        value={utente}
        onChange={(e) => setUtente(e.target.value)}
        data-testid="account-utente"
      />
      {modo === "recupera" && (
        <input
          aria-label={it.account.codice}
          placeholder={it.account.codice}
          className="field w-full"
          value={codice}
          onChange={(e) => setCodice(e.target.value)}
        />
      )}
      <input
        aria-label={modo === "recupera" ? it.account.nuovaPassword : it.account.password}
        placeholder={modo === "recupera" ? it.account.nuovaPassword : it.account.password}
        type="password"
        autoComplete={modo === "accedi" ? "current-password" : "new-password"}
        maxLength={128}
        className="field w-full"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="account-password"
      />
      {errore && (
        <p role="alert" className="text-rose-400">
          {errore}
        </p>
      )}
      <button
        className="btn btn-primary w-full"
        disabled={busy || !utente.trim() || !password}
        onClick={() => void invia()}
        data-testid="account-invia"
      >
        {modo === "registra"
          ? it.account.crea
          : modo === "accedi"
            ? it.account.accedi
            : it.account.reimposta}
      </button>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        {modo === "accedi" && (
          <button className="underline muted" onClick={() => setModo("recupera")}>
            {it.account.dimenticata}
          </button>
        )}
        {modo !== "registra" && onAltro && (
          <button className="underline muted" onClick={onAltro}>
            {it.account.nuovoProfilo}
          </button>
        )}
      </div>
    </section>
  );
}
