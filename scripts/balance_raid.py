"""Taratura dei raid. Uso: cd backend && uv run python ../scripts/balance_raid.py [N]

La squadra cooperativa sceglie a ogni giro la coppia carta-slot più potente tra 5 carte; tattiche
casuali. Stampa la percentuale di vittorie contro ogni boss e difficoltà (obiettivo: normale ~65%,
difficile ~35%, epico ~12%)."""

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.data_loader import load_characters, load_forms, load_ruleset
from app.draft import ROUNDS, build_deck, forms_by_base, hand
from app.engine import tattiche as tat
from app.engine.arene import ARENE
from app.engine.models import Team
from app.engine.roles import ROLES
from app.engine.scoring import potenza_ruolo
from app.engine.simulate import simulate
from app.raid import DIFFICOLTA, boss_team, load_bosses


def squadra(seed: int) -> Team:
    deck = build_deck(seed, list(load_characters().values()), forms_by_base(load_forms()))
    slots: dict[str, object] = {}
    for r in range(ROUNDS):
        libere = [x for x in ROLES if x not in slots]
        c, ruolo = max(
            ((c, x) for c in hand(deck, r) for x in libere),
            key=lambda t: (potenza_ruolo(t[0], t[1]), t[0].id),
        )
        slots[ruolo] = c
    return Team(nome="Squadra", members=[slots[x] for x in ROLES])  # type: ignore[misc]


def main() -> None:
    n = int(next((a for a in sys.argv[1:] if a.isdigit()), "200"))
    rules = load_ruleset()
    rnd = random.Random(3)
    for diff in DIFFICOLTA:
        riga = []
        for bid, b in load_bosses().items():
            v = 0
            for s in range(1, n + 1):
                piano = [rnd.choice(tat.TATTICHE) for _ in range(3)]
                r = simulate(
                    squadra(s), boss_team(bid, diff), s * 5 + 1, rules, registra=False,
                    tattiche={"A": piano, "B": tat.cpu_tattiche(s, piano)}, arena=b.arena,
                )
                v += r.vincitore == "A"
            riga.append(f"{bid} {100 * v / n:.0f}%")
        print(f"{diff:9}", " · ".join(riga))
    assert ARENE


if __name__ == "__main__":
    main()
