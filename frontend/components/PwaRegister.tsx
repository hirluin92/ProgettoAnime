"use client";

import { useEffect } from "react";

/** Registra il service worker (solo in produzione) per rendere il gioco installabile. */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
