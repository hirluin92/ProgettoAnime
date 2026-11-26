"""Tattiche segrete a fasi (V3). Funzioni pure.

Lo scontro ha 3 fasi (turni 1-3, 4-6, 7-10). Per ogni fase ogni lato sceglie una tattica; si
contrastano come sasso-carta-forbici: Assalto batte Tecnica, Tecnica batte Guardia, Guardia batte
Assalto. Chi vince il confronto infligge più danno nella fase, chi perde ne infligge meno.
"""

import random
from typing import Literal

from .models import Side

TATTICHE: tuple[str, ...] = ("assalto", "tecnica", "guardia")
BATTE: dict[str, str] = {"assalto": "tecnica", "tecnica": "guardia", "guardia": "assalto"}
FASI = 3
FASE_INIZIO: tuple[int, ...] = (1, 4, 7)  # primo turno di ogni fase
BONUS_VITTORIA = 1.15
MALUS_SCONFITTA = 0.90

Esito = Literal["A", "B", "pari"]


def fase_di_turno(turno: int) -> int:
    """Indice (0-2) della fase a cui appartiene il turno."""
    return sum(1 for inizio in FASE_INIZIO if turno >= inizio) - 1


def esito(a: str, b: str) -> Esito:
    if a == b:
        return "pari"
    return "A" if BATTE[a] == b else "B"


def moltiplicatore(lato: Side, a: str, b: str) -> float:
    """Moltiplicatore del danno inflitto dal lato `lato` in una fase."""
    e = esito(a, b)
    if e == "pari":
        return 1.0
    return BONUS_VITTORIA if e == lato else MALUS_SCONFITTA


def valida(tattiche: list[str]) -> bool:
    return len(tattiche) == FASI and all(t in TATTICHE for t in tattiche)


def cpu_tattiche(seed: int, giocatore: list[str]) -> list[str]:
    """La CPU parte a caso, poi 'legge' lo schema del giocatore (deterministico dal seme).

    Dalla seconda fase: 40% contrasta l'ultima tattica del giocatore, 25% ripete la propria,
    35% sceglie a caso. Il giocatore non vede mai le scelte della CPU prima dello scontro.
    """
    rnd = random.Random(f"tattiche:{seed}")
    out: list[str] = [rnd.choice(TATTICHE)]
    contrasto = {
        v: k for k, v in BATTE.items()
    }  # chi batte la tattica x (guardia batte assalto...)
    for f in range(1, FASI):
        r = rnd.random()
        if r < 0.40:
            out.append(contrasto[giocatore[f - 1]])
        elif r < 0.65:
            out.append(out[-1])
        else:
            out.append(rnd.choice(TATTICHE))
    return out


def cpu_carica(seed: int) -> str:
    """Politica della mossa finale della CPU: subito o trattenuta (dal seme)."""
    return random.Random(f"carica:{seed}").choice(("subito", "carica"))
