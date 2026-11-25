ROLES: tuple[str, ...] = (
    "Capitano",
    "Vice",
    "Tank",
    "Danno",
    "Supporto",
    "Supporto II",
    "Guaritore",
)

WANTED_TAGS: dict[str, tuple[str, str, str]] = {
    "Capitano": ("MELEE", "AURA", "RANGE"),
    "Vice": ("AURA", "MELEE", "MOBILITY"),
    "Tank": ("GIANT", "BARRIER", "MELEE"),
    "Danno": ("RANGE", "ELEMENT", "MELEE"),
    "Supporto": ("SUMMON", "MOBILITY", "BARRIER"),
    "Supporto II": ("SUMMON", "MOBILITY", "SPEED"),
    "Guaritore": ("HEAL", "AURA", "REGEN"),
}

VALID_TAGS: frozenset[str] = frozenset(
    "MELEE RANGE AURA BARRIER GIANT ELEMENT MOBILITY SPEED PSYCHIC ENERGY STEALTH "
    "SUMMON TRANSFORM HEAL REGEN".split()
)
