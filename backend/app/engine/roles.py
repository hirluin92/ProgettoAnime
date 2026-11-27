ROLES: tuple[str, ...] = (
    "Capitano",
    "Vice",
    "Tank",
    "Danno",
    "Supporto",
    "Supporto II",
    "Guaritore",
)

# Posizione in campo: 0 = prima linea, 1 = centro, 2 = retrovia (indice del ruolo -> fila).
FILA: tuple[int, ...] = (0, 1, 0, 1, 2, 2, 2)
FILE_NOMI: tuple[str, ...] = ("Prima linea", "Centro", "Retrovia")

ARCH_NOMI: dict[str, str] = {
    "BRU": "Lottatore",
    "ASS": "Assassino",
    "MAG": "Mago",
    "TAN": "Tank",
    "TIR": "Tiratore",
    "SUP": "Supporto",
    "GUA": "Guaritore",
    "EVO": "Evocatore",
}

ANIME_NOMI: dict[str, str] = {
    "naruto": "Naruto",
    "one-piece": "One Piece",
    "dragon-ball": "Dragon Ball",
    "demon-slayer": "Demon Slayer",
    "jujutsu-kaisen": "Jujutsu Kaisen",
    "my-hero-academia": "My Hero Academia",
    "attack-on-titan": "L'attacco dei Giganti",
    "fullmetal-alchemist": "Fullmetal Alchemist",
    "hunter-x-hunter": "Hunter x Hunter",
    "bleach": "Bleach",
    "death-note": "Death Note",
    "chainsaw-man": "Chainsaw Man",
    "one-punch-man": "One Punch Man",
    "fairy-tail": "Fairy Tail",
    "black-clover": "Black Clover",
    "seven-deadly-sins": "Seven Deadly Sins",
    "fire-force": "Fire Force",
    "mashle": "Mashle",
    "solo-leveling": "Solo Leveling",
    "blue-lock": "Blue Lock",
    "haikyuu": "Haikyu!!",
}

# Le etichette storiche: restano nei dati come descrizione, non hanno effetto sul combattimento.
VALID_TAGS: frozenset[str] = frozenset(
    "MELEE RANGE AURA BARRIER GIANT ELEMENT MOBILITY SPEED PSYCHIC ENERGY STEALTH "
    "SUMMON TRANSFORM HEAL REGEN".split()
)
