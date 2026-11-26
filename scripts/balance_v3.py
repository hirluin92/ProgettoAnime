"""Taratura delle affinità (V3). Uso: cd backend && uv run python ../scripts/balance_v3.py [N]

Confronta tre modi di piazzare 7 personaggi negli slot:
  casuale  = slot a caso;
  avido    = ogni carta, nell'ordine di pesca, nello slot libero che rende di più subito;
  ottimo   = assegnazione che massimizza la potenza totale (programmazione dinamica).
Obiettivi (PROPOSTA_V3.md §6): ottimo batte casuale di 8-12 punti percentuali, nessun archetipo
oltre il 55% di vittorie, lato A/B entro il 52%, nessuno slot dominante (>40%) per archetipo."""

import random
import sys
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.data_loader import load_characters, load_ruleset
from app.engine.models import Character, Team
from app.engine.roles import ROLES
from app.engine.scoring import potenza_ruolo
from app.engine.simulate import simulate

N_SLOT = len(ROLES)


def casuale(chars: list[Character], rng: random.Random) -> list[Character]:
    out = list(chars)
    rng.shuffle(out)
    return out


def avido(chars: list[Character], rng: random.Random) -> list[Character]:
    libero = list(range(N_SLOT))
    out: dict[int, Character] = {}
    for c in chars:
        best = max(libero, key=lambda i: potenza_ruolo(c, ROLES[i]))
        out[best] = c
        libero.remove(best)
    return [out[i] for i in range(N_SLOT)]


def ottimo(chars: list[Character], rng: random.Random) -> list[Character]:
    p = [[potenza_ruolo(c, ROLES[i]) for i in range(N_SLOT)] for c in chars]

    @lru_cache(maxsize=None)
    def best(k: int, mask: int) -> tuple[int, tuple[int, ...]]:
        if k == N_SLOT:
            return 0, ()
        top: tuple[int, tuple[int, ...]] = (-1, ())
        for i in range(N_SLOT):
            if mask & (1 << i):
                continue
            v, rest = best(k + 1, mask | (1 << i))
            if v + p[k][i] > top[0]:
                top = (v + p[k][i], (i, *rest))
        return top

    _, slots = best(0, 0)
    out: dict[int, Character] = {slots[k]: chars[k] for k in range(N_SLOT)}
    return [out[i] for i in range(N_SLOT)]


POLITICHE = {"casuale": casuale, "avido": avido, "ottimo": ottimo}


def sfida(a: str, b: str, n: int, seed: int) -> tuple[float, float, Counter[str]]:
    """% vittorie di a contro b (squadre da 7 carte pescate a caso, a ruoli alterni sul lato)."""
    chars = list(load_characters().values())
    rules = load_ruleset()
    rng = random.Random(seed)
    vinte = 0.0
    lato_a = 0
    slot: Counter[str] = Counter()
    for k in range(n):
        pick = rng.sample(chars, 14)
        ta = POLITICHE[a](pick[:7], rng)
        tb = POLITICHE[b](pick[7:], rng)
        if k % 2:  # a volte a è sul lato B
            r = simulate(Team(nome="b", members=tb), Team(nome="a", members=ta), rng.randrange(1, 2**31), rules, registra=False)
            vinte += r.vincitore == "B"
        else:
            r = simulate(Team(nome="a", members=ta), Team(nome="b", members=tb), rng.randrange(1, 2**31), rules, registra=False)
            vinte += r.vincitore == "A"
            lato_a += r.vincitore == "A"
        if b == "casuale" or a == "ottimo":
            pass
    return 100 * vinte / n, 100 * lato_a / max(1, (n + 1) // 2), slot


def archetipi(n: int, seed: int) -> dict[str, float]:
    """% vittorie per archetipo con piazzamento ottimo (squadre contro squadre)."""
    chars = list(load_characters().values())
    rules = load_ruleset()
    rng = random.Random(seed)
    w: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for _ in range(n):
        pick = rng.sample(chars, 14)
        ta, tb = ottimo(pick[:7], rng), ottimo(pick[7:], rng)
        r = simulate(Team(nome="A", members=ta), Team(nome="B", members=tb), rng.randrange(1, 2**31), rules, registra=False)
        for s, team in (("A", ta), ("B", tb)):
            for m in team:
                w[m.arch][0] += r.vincitore == s
                w[m.arch][1] += 1
    return {k: round(100 * v[0] / v[1], 1) for k, v in sorted(w.items())}


def slot_dominanti() -> dict[str, tuple[str, int]]:
    """Per ogni archetipo, lo slot in cui compare più spesso come scelta ottima (%)."""
    chars = list(load_characters().values())
    out: dict[str, Counter[str]] = defaultdict(Counter)
    rng = random.Random(3)
    for _ in range(600):
        team = ottimo(rng.sample(chars, 7), rng)
        for i, c in enumerate(team):
            out[c.arch][ROLES[i]] += 1
    return {a: (s.most_common(1)[0][0], round(100 * s.most_common(1)[0][1] / sum(s.values()))) for a, s in sorted(out.items())}


def main() -> None:
    n = int(next((a for a in sys.argv[1:] if a.isdigit()), "1500"))
    for a, b in (("ottimo", "casuale"), ("avido", "casuale"), ("ottimo", "avido")):
        v, lato, _ = sfida(a, b, n, 11)
        print(f"{a:8} contro {b:8}: {v:5.1f}% vittorie")
    print("Vittorie per archetipo (piazzamento ottimo):", archetipi(max(400, n // 2), 5))
    print("Slot più frequente per archetipo (%):", slot_dominanti())
    v, _, _ = sfida("ottimo", "ottimo", max(400, n // 2), 21)
    print(f"Specchio ottimo/ottimo (deve stare vicino a 50): {v:.1f}%")


if __name__ == "__main__":
    main()
