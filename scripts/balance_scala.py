"""Taratura della Scala. Uso: cd backend && uv run python ../scripts/balance_scala.py [N]

Gioca N corse con una squadra decente (quella che farebbe la CPU del draft veloce), tattiche casuali e
il primo potenziamento offerto. Stampa quanti gradini si vincono: l'obiettivo è una mediana di 5-8."""

import random
import statistics
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.data_loader import load_ruleset
from app.engine import tattiche as tat
from app.engine.models import Team
from app.engine.simulate import simulate
from app.quick import cpu_draft
from app.scala import MAX_GRADINI, POTENZIAMENTI, cpu_team, offerte_per


def corsa(seed: int, rnd: random.Random) -> int:
    squadra, _ = cpu_draft(seed)
    t = Team(nome="Tu", members=squadra)
    rules = load_ruleset()
    vinti = 0
    for g in range(1, MAX_GRADINI + 1):
        piano = [rnd.choice(tat.TATTICHE) for _ in range(3)]
        r = simulate(
            t, cpu_team(seed, g), seed * 7 + g, rules, registra=False,
            tattiche={"A": piano, "B": tat.cpu_tattiche(seed + g, piano)},
        )
        if r.vincitore != "A":
            break
        vinti += 1
        p = POTENZIAMENTI[offerte_per(seed, g)[0]]
        t.bonus_atk += p.atk
        t.bonus_hp += p.hp
        t.bonus_dif += p.dif
        t.energia_iniziale += p.energia
        t.scudo_iniziale += p.scudo
    return vinti


def main() -> None:
    n = int(next((a for a in sys.argv[1:] if a.isdigit()), "300"))
    rnd = random.Random(5)
    ris = [corsa(s, rnd) for s in range(1, n + 1)]
    c = Counter(ris)
    print(f"Corse: {n} · mediana {statistics.median(ris)} · media {statistics.mean(ris):.1f} · max {max(ris)}")
    print("Distribuzione (gradini vinti: corse):", dict(sorted(c.items())))
    print(f"Superano il gradino 1: {100 * sum(1 for x in ris if x >= 1) / n:.0f}% · il 5: {100 * sum(1 for x in ris if x >= 5) / n:.0f}% · il 10: {100 * sum(1 for x in ris if x >= 10) / n:.0f}%")


if __name__ == "__main__":
    main()
