// Colore di riferimento per anime (usato dalle carte senza immagini).
export const ANIME_PALETTE: Record<string, { from: string; to: string; label: string }> = {
  naruto: { from: "#ff9a3c", to: "#b34700", label: "Naruto" },
  "one-piece": { from: "#ff5a5a", to: "#8f1f1f", label: "One Piece" },
  "dragon-ball": { from: "#ffd23c", to: "#c25a00", label: "Dragon Ball" },
  "demon-slayer": { from: "#2fbf8f", to: "#0d5a45", label: "Demon Slayer" },
  "jujutsu-kaisen": { from: "#9a86ff", to: "#2a1a80", label: "Jujutsu Kaisen" },
  "my-hero-academia": { from: "#4fd16a", to: "#0f5a2b", label: "My Hero Academia" },
  "attack-on-titan": { from: "#b08a5a", to: "#3a2a17", label: "L'attacco dei Giganti" },
  "fullmetal-alchemist": { from: "#e8c14a", to: "#7a2a1a", label: "Fullmetal Alchemist" },
  "hunter-x-hunter": { from: "#5ad07a", to: "#16505a", label: "Hunter x Hunter" },
  bleach: { from: "#ff8a1f", to: "#262a40", label: "Bleach" },
  "death-note": { from: "#c9c4d6", to: "#2a1a3a", label: "Death Note" },
  "chainsaw-man": { from: "#ff4a3a", to: "#3a1210", label: "Chainsaw Man" },
  "one-punch-man": { from: "#ffd84a", to: "#9a2a2a", label: "One Punch Man" },
  "fairy-tail": { from: "#ff9a4a", to: "#2a4aa0", label: "Fairy Tail" },
  "black-clover": { from: "#a0a0b0", to: "#1a1a30", label: "Black Clover" },
};
const FALLBACK = { from: "#6b7280", to: "#1f2937", label: "Anime" };

export function paletteFor(anime: string) {
  return ANIME_PALETTE[anime] ?? FALLBACK;
}
