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

# Archetipi adatti a ogni ruolo: il personaggio al posto giusto combatte meglio.
ARCH_ADATTI: dict[str, frozenset[str]] = {
    "Capitano": frozenset({"BRU", "MAG", "EVO"}),
    "Vice": frozenset({"BRU", "ASS"}),
    "Tank": frozenset({"TAN", "BRU"}),
    "Danno": frozenset({"MAG", "ASS", "TIR"}),
    "Supporto": frozenset({"SUP", "EVO", "TIR"}),
    "Supporto II": frozenset({"SUP", "EVO", "MAG"}),
    "Guaritore": frozenset({"GUA", "SUP"}),
}

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
}

# Le etichette storiche: restano nei dati come descrizione, non hanno effetto sul combattimento.
VALID_TAGS: frozenset[str] = frozenset(
    "MELEE RANGE AURA BARRIER GIANT ELEMENT MOBILITY SPEED PSYCHIC ENERGY STEALTH "
    "SUMMON TRANSFORM HEAL REGEN".split()
)
