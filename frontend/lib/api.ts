import it from "@/i18n/it.json";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const SHOW_IMAGES = process.env.NEXT_PUBLIC_SHOW_IMAGES !== "false";

export function wsUrl(path: string): string {
  return API_URL.replace(/^http/, "ws") + path;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_URL + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // gli errori di validazione (422) hanno `detail` come lista: non è un testo da mostrare
    throw new Error(typeof body.detail === "string" ? body.detail : it.errori.richiestaNonValida);
  }
  return res.json() as Promise<T>;
}
