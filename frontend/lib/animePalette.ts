// Colore di riferimento per anime (usato dalle carte senza immagini).
export const ANIME_PALETTE: Record<string, { from: string; to: string; label: string }> = {
  naruto: { from: "#ff9a3c", to: "#b34700", label: "Naruto" },
  "one-piece": { from: "#ff5a5a", to: "#8f1f1f", label: "One Piece" },
  "dragon-ball": { from: "#ffd23c", to: "#c25a00", label: "Dragon Ball" },
  "demon-slayer": { from: "#2fbf8f", to: "#0d5a45", label: "Demon Slayer" },
  "jujutsu-kaisen": { from: "#9a86ff", to: "#2a1a80", label: "Jujutsu Kaisen" },
};
const FALLBACK = { from: "#6b7280", to: "#1f2937", label: "Anime" };

export function paletteFor(anime: string) {
  return ANIME_PALETTE[anime] ?? FALLBACK;
}
