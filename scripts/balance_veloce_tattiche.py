"""Quanto pesano le tattiche scelte con giudizio nella Veloce.

Uso: cd backend && PYTHONPATH=. uv run python ../scripts/balance_veloce_tattiche.py [N]

A squadre identiche per entrambe le politiche (stesso draft, stessa CPU), confronta la quota di
vittorie di: scelta casuale delle tattiche, schema fisso, e una lettura della CPU fase per fase
(ora possibile con le fasi live: dopo ogni fase si vede cosa ha giocato la CPU).
"""

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.data_loader import load_ruleset
from app.engine import tattiche as tat
from app.engine.arene import arena_per_seme
from app.engine.simulate import simulate
from app.quick import _squadre, cpu_draft

CONTRASTO = {v: k for k, v in tat.BATTE.items()}  # chi batte x


def gioca(seed: int, politica: str, rnd: random.Random) -> bool:
    members, spent = cpu_draft(seed + 100_003)  # un giocatore forte quanto la CPU
    a, b, *_ = _squadre(seed, members, spent)
    mie: list[str] = []
    cpu_vere = tat.cpu_tattiche(seed, ["assalto"] * 3)  # la CPU parte allo stesso modo
    for f in range(tat.FASI):
        if politica == "casuale":
            mie.append(rnd.choice(tat.TATTICHE))
        elif politica == "fisso":
            mie.append(("assalto", "tecnica", "guardia")[f])
        else:  # lettura: dalla fase 2 gioca la tattica che batte quella più probabile della CPU
            if f == 0:
                mie.append(rnd.choice(tat.TATTICHE))
            else:
                # la CPU contrasta la mia ultima (40%), ripete la sua (25%) o va a caso (35%)
                p_contra = CONTRASTO[mie[-1]]
                p_ripete = cpu_vere[f - 1]
                probabile = p_contra  # è la mossa più probabile
                if p_ripete != p_contra and rnd.random() < 0.0:
                    probabile = p_ripete
                mie.append(CONTRASTO[probabile])
    cpu = tat.cpu_tattiche(seed, mie)
    r = simulate(
        a, b, seed * 7 + 1, load_ruleset(), tattiche={"A": mie, "B": cpu},
        arena=arena_per_seme(seed).id,
    )  # fmt: skip
    return r.vincitore == "A"


def main() -> None:
    n = int(next((x for x in sys.argv[1:] if x.isdigit()), "600"))
    rnd = random.Random(3)
    for p in ("casuale", "fisso", "lettura"):
        w = sum(gioca(s, p, rnd) for s in range(1, n + 1))
        print(f"{p:8} vince {100 * w / n:.1f}% (N={n})")


if __name__ == "__main__":
    main()
