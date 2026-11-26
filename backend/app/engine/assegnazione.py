"""Assegnazione ottima di 7 personaggi ai 7 slot (massima potenza totale). Funzione pura."""

from functools import cache

from .models import Character
from .roles import ROLES
from .scoring import potenza_ruolo

N = len(ROLES)


def assegna_ottimo(chars: list[Character]) -> list[Character]:
    """Restituisce i personaggi nell'ordine degli slot, con la massima potenza complessiva."""
    p = [[potenza_ruolo(c, ROLES[i]) for i in range(N)] for c in chars]

    @cache
    def best(k: int, mask: int) -> tuple[int, tuple[int, ...]]:
        if k == N:
            return 0, ()
        top: tuple[int, tuple[int, ...]] = (-1, ())
        for i in range(N):
            if mask & (1 << i):
                continue
            v, rest = best(k + 1, mask | (1 << i))
            if v + p[k][i] > top[0]:
                top = (v + p[k][i], (i, *rest))
        return top

    _, slots = best(0, 0)
    out: dict[int, Character] = {slots[k]: chars[k] for k in range(N)}
    return [out[i] for i in range(N)]
