"use client";

import { useEffect, useState } from "react";
import it from "@/i18n/it.json";

export type Consent = "accepted" | "rejected" | null;
const KEY = "cookie-consent";
const EVENT = "consent-change";

export function useConsent(): Consent {
  const [value, setValue] = useState<Consent>(null);
  useEffect(() => {
    const read = () => setValue((window.localStorage.getItem(KEY) as Consent) ?? null);
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);
  return value;
}

export default function CookieBanner() {
  const consent = useConsent();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready || consent) return null;
  const choose = (v: "accepted" | "rejected") => {
    window.localStorage.setItem(KEY, v);
    window.dispatchEvent(new Event(EVENT));
  };
  return (
    <div
      role="dialog"
      aria-label={it.cookie.titolo}
      data-testid="cookie-banner"
      className="fixed inset-x-2 bottom-2 z-50 mx-auto max-w-xl rounded-2xl border bg-white p-4 text-sm text-stone-900 shadow-xl"
    >
      <p>{it.cookie.testo}</p>
      <div className="mt-3 flex gap-2">
        <button
          className="min-h-11 flex-1 rounded-xl border-2 font-bold"
          onClick={() => choose("rejected")}
        >
          {it.cookie.rifiuta}
        </button>
        <button
          className="min-h-11 flex-1 rounded-xl bg-stone-900 font-bold text-white"
          onClick={() => choose("accepted")}
        >
          {it.cookie.accetta}
        </button>
      </div>
    </div>
  );
}
