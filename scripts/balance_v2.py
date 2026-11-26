"""Simulatore di bilanciamento. Uso: cd backend && uv run python ../scripts/balance_v2.py [N] [--md]
Squadre casuali di 14 personaggi distinti; ruoli assegnati in modo ottimo (come farebbe un giocatore)."""

import random
import statistics
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.data_loader import load_characters, load_ruleset
from app.engine.models import Character, Team
from app.engine.roles import ROLES
from app.engine.scoring import potenza_ruolo
from app.engine.simulate import simulate


def assegna(chars: list[Character]) -> list[Character]:
    """Greedy: riempie i ruoli dal più scarso di candidati al più ricco."""
    libero = list(chars)
    out: dict[int, Character] = {}
    for i in sorted(range(7), key=lambda i: -i):  # i ruoli di retrovia prima
        best = max(libero, key=lambda c: potenza_ruolo(c, ROLES[i]))
        out[i] = best
        libero.remove(best)
    return [out[i] for i in range(7)]


def main() -> None:
    n = int(next((a for a in sys.argv[1:] if a.isdigit()), "4000"))
    chars = list(load_characters().values())
    rules = load_ruleset()
    rng = random.Random(7)
    apparizioni: dict[str, int] = defaultdict(int)
    vittorie: dict[str, int] = defaultdict(int)
    arch_v: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    mossa_v: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    passiva_v: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    turni: list[int] = []
    ko = 0
    vitt_a = 0
    for k in range(n):
        pick = rng.sample(chars, 14)
        ta = Team(nome="A", members=assegna(pick[:7]))
        tb = Team(nome="B", members=assegna(pick[7:]))
        r = simulate(ta, tb, rng.randrange(1, 2**31), rules, registra=False)
        turni.append(r.turni)
        ko += r.totali["A"] == 0 or r.totali["B"] == 0
        vitt_a += r.vincitore == "A"
        for s, team in (("A", ta), ("B", tb)):
            win = r.vincitore == s
            for m in team.members:
                apparizioni[m.id] += 1
                vittorie[m.id] += win
                arch_v[m.arch][0] += win
                arch_v[m.arch][1] += 1
                mossa_v[m.mossa.effetto][0] += win
                mossa_v[m.mossa.effetto][1] += 1
                passiva_v[m.passiva.effetto][0] += win
                passiva_v[m.passiva.effetto][1] += 1
    wr = {c.id: vittorie[c.id] / max(1, apparizioni[c.id]) for c in chars}
    print(f"Scontri: {n} · turni medi {statistics.mean(turni):.1f} (min {min(turni)}, max {max(turni)}) · K.O. totale {100 * ko / n:.0f}% · vittorie lato A {100 * vitt_a / n:.1f}%")
    ratings = [c.rating for c in chars]
    corr = statistics.correlation(ratings, [wr[c.id] for c in chars])
    print(f"Correlazione rating / % vittoria: {corr:.2f}")
    vals = sorted(wr.values())
    print(f"% vittoria per personaggio: min {vals[0]:.2f}  p10 {vals[len(vals) // 10]:.2f}  mediana {statistics.median(vals):.2f}  p90 {vals[-len(vals) // 10]:.2f}  max {vals[-1]:.2f}")
    pend, inter = statistics.linear_regression(ratings, [wr[c.id] for c in chars])
    res = {c.id: wr[c.id] - (inter + pend * c.rating) for c in chars}

    def per(chiave: str) -> dict[str, float]:
        out: dict[str, list[float]] = defaultdict(list)
        for c in chars:
            k = c.arch if chiave == "arch" else c.mossa.effetto if chiave == "mossa" else c.passiva.effetto
            out[k].append(res[c.id])
        return {k: round(statistics.mean(v), 3) for k, v in sorted(out.items())}

    print("\nValore oltre il rating (0 = equilibrato):")
    print("  Archetipi:", per("arch"))
    print("  Mosse:", per("mossa"))
    print("  Passive:", per("passiva"))
    print(f"  Dev. standard residui: {statistics.pstdev(res.values()):.3f}")
    if "--scrivi" in sys.argv:
        import json

        lo, hi = min(wr.values()), max(wr.values())
        f = Path(__file__).resolve().parent.parent / "backend" / "data" / "schede.json"
        schede = json.loads(f.read_text(encoding="utf8"))
        for cid, w in wr.items():
            schede[cid]["costo"] = round(1 + 11 * (w - lo) / (hi - lo))
        f.write_text(json.dumps(schede, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
        costi = sorted(s["costo"] for s in schede.values())
        print(
            f"\nPrezzi scritti in schede.json: min {costi[0]}, mediana {costi[50]}, "
            f"max {costi[-1]}, media {statistics.mean(costi):.1f}"
        )
    ordine = sorted(chars, key=lambda c: -wr[c.id])
    print("\nTop 8:", [(c.nome, c.rating, round(wr[c.id], 2)) for c in ordine[:8]])
    print("Ultimi 8:", [(c.nome, c.rating, round(wr[c.id], 2)) for c in ordine[-8:]])


if __name__ == "__main__":
    main()
