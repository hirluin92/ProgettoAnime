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
    throw new Error(body.detail ?? `Errore ${res.status}`);
  }
  return res.json() as Promise<T>;
}
