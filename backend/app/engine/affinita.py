"""Affinità tra personaggio e ruolo (V3): quanto rende uno slot. Funzioni pure e deterministiche.

affinità = base[archetipo][ruolo] + firma + tratti + scarto      (punti %, circa da -30 a +35)
moltiplicatore = 1 + affinità/100, con affinità limitata a [-28, +35]  (applicato alla forza)
"""

import zlib

from .models import Character
from .roles import ROLES

# punti % per archetipo, nell'ordine di ROLES:
# Capitano, Vice, Tank, Danno, Supporto, Supporto II, Guaritore
BASE: dict[str, tuple[int, ...]] = {
    "BRU": (25, 15, 8, 10, -10, -10, -25),
    "ASS": (5, 15, -15, 25, -5, -5, -25),
    "MAG": (15, 0, -25, 20, 10, 10, -5),
    "TAN": (5, 8, 30, -15, -5, -5, -5),
    "TIR": (0, 0, -20, 18, 12, 5, -10),
    "SUP": (-5, 0, -5, -10, 25, 25, 10),
    "GUA": (-15, -10, -5, -25, 10, 10, 30),
    "EVO": (20, 5, -10, 5, 15, 15, 0),
}

# ritocchi dai tratti (tag), punti % per ruolo
TAG_MOD: dict[str, dict[str, int]] = {
    "AURA": {"Capitano": 5, "Supporto": 3},
    "GIANT": {"Tank": 5},
    "BARRIER": {"Tank": 4, "Supporto": 3},
    "HEAL": {"Guaritore": 5, "Supporto": 2},
    "REGEN": {"Guaritore": 4, "Tank": 2},
    "SPEED": {"Vice": 3, "Danno": 3},
    "MOBILITY": {"Vice": 2, "Danno": 2},
    "RANGE": {"Danno": 3, "Supporto": 2},
    "MELEE": {"Vice": 2, "Tank": 1},
    "SUMMON": {"Supporto": 3, "Capitano": 2},
    "ELEMENT": {"Danno": 2},
    "PSYCHIC": {"Supporto": 3},
    "ENERGY": {"Danno": 2},
    "STEALTH": {"Danno": 2, "Vice": 1},
    "TRANSFORM": {"Capitano": 3},
}

FIRMA = 8
TAG_MAX = 8
SCARTO_MAX = 4
AFF_MIN = -28  # moltiplicatore minimo 0,72
AFF_MAX = 35  # moltiplicatore massimo 1,35
ADATTO_SOGLIA = 10  # da qui in su lo slot è "adatto" (semaforo verde)


def scarto(ch: Character, ruolo: str) -> int:
    """Piccola variazione fissa per personaggio e ruolo (-4..+4)."""
    chiave = f"{ch.base_id or ch.id}:{ruolo}"
    return zlib.crc32(chiave.encode()) % (2 * SCARTO_MAX + 1) - SCARTO_MAX


def affinita(ch: Character, ruolo: str) -> int:
    i = ROLES.index(ruolo)
    base = BASE[ch.arch][i]
    tratti = sum(TAG_MOD.get(t, {}).get(ruolo, 0) for t in ch.tags)
    tratti = max(-TAG_MAX, min(TAG_MAX, tratti))
    firma = FIRMA if ch.ruolo_firma == ruolo else 0
    totale = base + firma + tratti + scarto(ch, ruolo)
    return max(AFF_MIN, min(AFF_MAX, totale))


def moltiplicatore(ch: Character, ruolo: str) -> float:
    return 1 + affinita(ch, ruolo) / 100


def tutte(ch: Character) -> dict[str, int]:
    return {r: affinita(ch, r) for r in ROLES}
