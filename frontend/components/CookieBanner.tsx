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
      className="panel fixed inset-x-2 bottom-2 z-50 mx-auto max-w-xl bg-[#14112a] p-4 text-sm"
    >
      <p>{it.cookie.testo}</p>
      <div className="mt-3 flex gap-2">
        <button className="btn flex-1" onClick={() => choose("rejected")}>
          {it.cookie.rifiuta}
        </button>
        <button className="btn btn-primary flex-1" onClick={() => choose("accepted")}>
          {it.cookie.accetta}
        </button>
      </div>
    </div>
  );
}
