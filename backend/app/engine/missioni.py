"""Missioni segrete (V3): un obiettivo nascosto che, se completato, dà un bonus alla squadra.

La valutazione è una funzione pura della squadra finale, del budget avanzato e delle regole.
"""

import random
from collections.abc import Callable
from dataclasses import dataclass

from .affinita import affinita
from .models import Ruleset, Team
from .roles import ROLES
from .scoring import sinergie_squadra

BONUS = 0.03  # +3% attacco e vita


@dataclass(frozen=True)
class Missione:
    id: str
    nome: str
    descrizione: str
    check: Callable[[Team, int, Ruleset], bool]


def _stesso_universo(t: Team, _b: int, _r: Ruleset) -> bool:
    n: dict[str, int] = {}
    for m in t.members:
        n[m.anime] = n.get(m.anime, 0) + 1
    return max(n.values()) >= 3


def _nessuna_leggendaria(t: Team, _b: int, _r: Ruleset) -> bool:
    return all(m.rating < 90 for m in t.members)


def _tutti_sotto(t: Team, _b: int, _r: Ruleset) -> bool:
    return all(m.rating <= 88 for m in t.members)


def _quattro_universi(t: Team, _b: int, _r: Ruleset) -> bool:
    return len({m.anime for m in t.members}) >= 4


def _tre_in_firma(t: Team, _b: int, _r: Ruleset) -> bool:
    return sum(1 for m, r in zip(t.members, ROLES, strict=True) if m.ruolo_firma == r) >= 3


def _risparmiatore(_t: Team, budget: int, _r: Ruleset) -> bool:
    return budget >= 8


def _spendaccione(_t: Team, budget: int, _r: Ruleset) -> bool:
    return budget <= 2


def _sinergia(t: Team, _b: int, r: Ruleset) -> bool:
    return any(s.membri >= 3 for s in sinergie_squadra("A", t, r.tratti))


def _specialisti(t: Team, _b: int, _r: Ruleset) -> bool:
    ruoli = {r: m for m, r in zip(t.members, ROLES, strict=True)}
    return affinita(ruoli["Tank"], "Tank") >= 20 and affinita(ruoli["Guaritore"], "Guaritore") >= 20


def _outsider(t: Team, _b: int, _r: Ruleset) -> bool:
    return sum(1 for m in t.members if m.rating < 80) >= 3


MISSIONI: dict[str, Missione] = {
    m.id: m
    for m in (
        Missione(
            "universo",
            "Una sola saga",
            "3 o più personaggi dello stesso universo.",
            _stesso_universo,
        ),
        Missione(
            "senza_leggende",
            "Niente leggende",
            "Nessun personaggio con voto 90 o più.",
            _nessuna_leggendaria,
        ),
        Missione("umili", "Squadra umile", "Tutti i personaggi con voto 88 o meno.", _tutti_sotto),
        Missione(
            "quattro_universi",
            "Il giro del mondo",
            "Personaggi da almeno 4 universi diversi.",
            _quattro_universi,
        ),
        Missione(
            "in_firma", "Nati per il ruolo", "3 personaggi nel loro ruolo firma.", _tre_in_firma
        ),
        Missione(
            "risparmiatore",
            "Cassa forte",
            "Finire con almeno 8 punti di budget avanzati.",
            _risparmiatore,
        ),
        Missione(
            "spendaccione",
            "Tutto sul piatto",
            "Spendere tutto: al massimo 2 punti avanzati.",
            _spendaccione,
        ),
        Missione(
            "sinergia", "Fratelli d'arme", "Una sinergia di gruppo attiva con 3 membri.", _sinergia
        ),
        Missione(
            "specialisti",
            "Specialisti",
            "Un Tank e un Guaritore con affinità +20% o più.",
            _specialisti,
        ),
        Missione("outsider", "Gli outsider", "Almeno 3 personaggi con voto sotto 80.", _outsider),
    )
}
ORDINE: tuple[str, ...] = tuple(MISSIONI)


def missione_per_seme(seed: int, chiave: str = "", escludi: tuple[str, ...] = ()) -> Missione:
    """Missione deterministica (stesso seme e chiave: stessa missione)."""
    ammesse = [m for m in ORDINE if m not in escludi]
    return MISSIONI[random.Random(f"missione:{seed}:{chiave}").choice(ammesse)]


def completata(mid: str, team: Team, budget_avanzato: int, regole: Ruleset) -> bool:
    return MISSIONI[mid].check(team, budget_avanzato, regole)
