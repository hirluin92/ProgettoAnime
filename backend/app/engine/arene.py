"""Arene (V3): un modificatore di regole noto prima del draft, scelto dal seme. Dati puri."""

import zlib
from dataclasses import dataclass


@dataclass(frozen=True)
class Arena:
    id: str
    nome: str
    descrizione: str
    vel: float = 1.0  # moltiplicatore della velocità di tutti
    energia: float = 0.0  # bonus all'energia guadagnata (1.0 = doppia)
    bruciatura_prima_linea: bool = False  # chi sta in prima linea brucia a ogni turno
    mancato: float = 0.0  # probabilità che un attacco vada a vuoto
    danno: float = 1.0  # moltiplicatore del danno di tutti
    tank_dif: float = 1.0  # moltiplicatore della difesa dei Tank
    crit: float = 0.0  # bonus alla probabilità di critico


ARENE: dict[str, Arena] = {
    a.id: a
    for a in (
        Arena("ghiaccio", "Arena di ghiaccio", "Il gelo rallenta tutti: −15% velocità.", vel=0.85),
        Arena(
            "torneo",
            "Torneo del potere",
            "L'energia si carica il doppio più in fretta: più mosse speciali.",
            energia=1.0,
        ),
        Arena(
            "vulcano",
            "Vulcano",
            "La prima linea brucia a ogni turno: servono resistenza e cure.",
            bruciatura_prima_linea=True,
        ),
        Arena("nebbia", "Nebbia fitta", "Il 12% degli attacchi va a vuoto.", mancato=0.12),
        Arena(
            "gravita",
            "Gravità pesante",
            "Tutti i danni +20%, ma i Tank hanno la difesa +25%.",
            danno=1.2,
            tank_dif=1.25,
        ),
        Arena("luna", "Luna rossa", "I colpi critici sono molto più frequenti (+15%).", crit=0.15),
    )
}
ORDINE: tuple[str, ...] = tuple(ARENE)


def arena_per_seme(seed: int) -> Arena:
    """Stesso seme, stessa arena (la sfida del giorno è uguale per tutti)."""
    return ARENE[ORDINE[zlib.crc32(f"arena:{seed}".encode()) % len(ORDINE)]]
