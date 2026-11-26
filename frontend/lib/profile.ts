"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

const KEY = "arena-profile-id";

export interface ObiettivoView {
  id: string;
  nome: string;
  descrizione: string;
  fatto: boolean;
}
export interface ProfileView {
  id: string;
  name: string;
  xp: number;
  livello: number;
  xp_livello: number;
  xp_prossimo: number;
  titolo: string;
  partite: number;
  vittorie: number;
  best_scala: number;
  collezione: string[];
  collezione_totale: number;
  obiettivi: ObiettivoView[];
  stagione: { id: string; punti: number; posizione: number | null };
}
export interface Premio {
  xp: number;
  xp_totale: number;
  livello_prima: number;
  livello_dopo: number;
  titolo: string;
  obiettivi_completati: ObiettivoView[];
  punti_stagione: number;
  nuove_carte: number;
}
export interface CollectionItem {
  id: string;
  nome: string;
  anime: string;
  rating: number;
  forma: string | null;
}
export interface SeasonView {
  season: string;
  top: { name: string; points: number }[];
}

export function getProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function saveProfileId(id: string): void {
  window.localStorage.setItem(KEY, id);
  window.dispatchEvent(new Event("profile-change"));
}

export function clearProfileId(): void {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("profile-change"));
}

/** Percentuale di avanzamento verso il livello successivo. */
export function avanzamento(p: Pick<ProfileView, "xp" | "xp_livello" | "xp_prossimo">): number {
  const span = Math.max(1, p.xp_prossimo - p.xp_livello);
  return Math.max(0, Math.min(100, ((p.xp - p.xp_livello) / span) * 100));
}

/** Il profilo del dispositivo (se esiste), con ricarica quando cambia. */
export function useProfile() {
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const id = getProfileId();
    if (!id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      setProfile(await api<ProfileView>(`/api/profile/${id}`));
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    window.addEventListener("profile-change", load);
    return () => window.removeEventListener("profile-change", load);
  }, [load]);
  return { profile, loading, reload: load };
}

export async function creaProfilo(name: string): Promise<ProfileView> {
  const p = await api<ProfileView>("/api/profile", {
    method: "POST",
    body: JSON.stringify({ id: getProfileId(), name }),
  });
  saveProfileId(p.id);
  return p;
}
