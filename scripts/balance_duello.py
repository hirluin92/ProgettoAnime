"""Taratura del Duello. Uso: cd backend && PYTHONPATH=. uv run python ../scripts/balance_duello.py [N]

1) Vittorie per fascia di costo e per effetto (mazzi casuali con curva simile, euristico contro euristico):
   ogni fascia dovrebbe stare vicino al 50%.
2) Bravura contro carte: a mazzo uguale, simulato > euristico > casuale.
"""

import random
import statistics
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.data_loader import load_characters, load_forms, load_ruleset
from app.duello import ai
from app.duello.carte import Carta, carta_da
from app.duello.motore import gioca_turno, nuovo

rules = load_ruleset()
LEG = frozenset(frozenset({d.a, d.b}) for d in rules.duos)
RIV = frozenset(frozenset({d.a, d.b}) for d in rules.rivalita)
CARTE = [carta_da(c) for c in [*load_characters().values(), *load_forms().values()]]


def mazzo(rnd: random.Random, lo: int = 22, hi: int = 30) -> list[Carta]:
    while True:
        m = rnd.sample(CARTE, 8)
        if lo <= sum(c.costo for c in m) <= hi:
            return m


def gioca(d0, d1, p0, p1, seed):  # type: ignore[no-untyped-def]
    s = nuovo(seed, d0, d1, LEG, RIV)
    r = random.Random(seed)
    while not s.finita:
        gioca_turno(s, p0(s, 0, r), p1(s, 1, r), registra=False)
    return s.vincitore


H = lambda s, l, r: ai.mosse_euristiche(s, l)  # noqa: E731
M = lambda s, l, r: ai.mosse_simulate(s, l, CARTE, r)  # noqa: E731
R = lambda s, l, r: ai.mosse_casuali(s, l, r)  # noqa: E731


def main() -> None:
    n = int(next((a for a in sys.argv[1:] if a.isdigit()), "3000"))
    rnd = random.Random(11)
    vitt: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    per_costo: dict[int, list[int]] = defaultdict(lambda: [0, 0])
    per_mossa: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    per_passiva: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    lato0 = 0
    for k in range(n):
        d0, d1 = mazzo(rnd), mazzo(rnd)
        v = gioca(d0, d1, H, H, k)
        lato0 += v == 0
        for lato, d in ((0, d0), (1, d1)):
            w = int(v == lato)
            for c in d:
                for tab, key in ((vitt, c.id), (per_costo, c.costo), (per_mossa, c.mossa), (per_passiva, c.passiva)):
                    tab[key][0] += w  # type: ignore[index]
                    tab[key][1] += 1  # type: ignore[index]
    print(f"Partite {n} · il lato che gioca per primo (indice 0) vince {100 * lato0 / n:.1f}%")
    print("Vittorie per costo:", {k: f"{100 * v[0] / v[1]:.0f}%" for k, v in sorted(per_costo.items())})
    print("Vittorie per mossa:", {k: f"{100 * v[0] / v[1]:.0f}%" for k, v in sorted(per_mossa.items())})
    print("Vittorie per passiva:", {k: f"{100 * v[0] / v[1]:.0f}%" for k, v in sorted(per_passiva.items())})
    tutte = [v[0] / v[1] for v in vitt.values() if v[1] >= 30]
    print(f"Carte: min {min(tutte):.2f} · p10 {sorted(tutte)[len(tutte)//10]:.2f} · mediana {statistics.median(tutte):.2f} · p90 {sorted(tutte)[-len(tutte)//10]:.2f} · max {max(tutte):.2f}")
    by = {c.id: c for c in CARTE}
    ordine = sorted(((v[0] / v[1], k) for k, v in vitt.items() if v[1] >= 30), reverse=True)
    print("Top 8:", [(by[k].nome, by[k].costo, round(w, 2)) for w, k in ordine[:8]])
    print("Ultime 8:", [(by[k].nome, by[k].costo, round(w, 2)) for w, k in ordine[-8:]])
    # bravura: mazzo identico
    m = 60
    ris = {}
    for nome, pa, pb in (("euristico contro casuale", H, R), ("simulato contro euristico", M, H)):
        w = 0
        for k in range(m):
            d = mazzo(rnd)
            v = gioca(d, d, pa, pb, k) if k % 2 == 0 else gioca(d, d, pb, pa, k)
            w += (v == 0) if k % 2 == 0 else (v == 1)
        ris[nome] = f"{100 * w / m:.0f}%"
    print("A mazzo identico:", ris)


if __name__ == "__main__":
    main()
