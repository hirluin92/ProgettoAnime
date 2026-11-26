"""Raid cooperativo (V3): 2-4 giocatori costruiscono una squadra comune e sfidano un boss.

Il boss è una squadra di 7 personaggi (il boss è il Capitano) con vita e attacco moltiplicati
dalla difficoltà. Funzioni pure sui dati; la stanza sta in rooms/raid_room.py.
"""

import json
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

from app.data_loader import DATA_DIR, load_characters
from app.engine.models import Team

Difficolta = Literal["normale", "difficile", "epico"]

# difficoltà: moltiplicatore di vita e attacco del boss, bonus ai suoi sette
DIFFICOLTA: dict[str, tuple[float, float, float]] = {
    "normale": (1.6, 1.0, 0.0),
    "difficile": (2.3, 1.08, 0.0),
    "epico": (3.2, 1.15, 0.03),
}


@dataclass(frozen=True)
class Boss:
    id: str
    nome: str
    descrizione: str
    arena: str
    squadra: tuple[str, ...]
    fattore: float  # tara per boss: 1.0 = difficoltà di riferimento


@lru_cache
def load_bosses() -> dict[str, Boss]:
    data = json.loads((DATA_DIR / "bosses.json").read_text(encoding="utf-8"))
    return {
        d["id"]: Boss(
            d["id"], d["nome"], d["descrizione"], d["arena"], tuple(d["squadra"]), d["fattore"]
        )
        for d in data
    }


def boss_team(boss_id: str, difficolta: str) -> Team:
    b = load_bosses()[boss_id]
    chars = load_characters()
    hp, atk, bonus = DIFFICOLTA[difficolta]
    return Team(
        nome=b.nome,
        members=[chars[c] for c in b.squadra],
        boss_hp=hp * b.fattore,
        boss_atk=1 + (atk - 1) * b.fattore,
        bonus_missione=bonus,
    )
