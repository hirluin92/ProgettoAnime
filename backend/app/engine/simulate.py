from typing import Any

from .models import (
    Attacco,
    Breakdown,
    Combo,
    Counter,
    Duello,
    Event,
    Ingresso,
    Ko,
    MatchResult,
    Ruleset,
    Side,
    Team,
)
from .rng import Rng
from .roles import ROLES
from .scoring import DUO_BONUS, individual_scores, team_counters, team_duos

SIDES: tuple[Side, Side] = ("A", "B")


def _other(s: Side) -> Side:
    return "B" if s == "A" else "A"


def simulate(team_a: Team, team_b: Team, seed: int, rules: Ruleset) -> MatchResult:
    """Funzione pura e deterministica: stesso input e seed, stesso risultato."""
    rng = Rng(seed)
    teams: dict[Side, Team] = {"A": team_a, "B": team_b}
    powers: dict[Side, list[int]] = {}
    brk: dict[Side, Breakdown] = {}
    for s in SIDES:
        powers[s], brk[s] = individual_scores(teams[s], rng)

    counters = {s: team_counters(teams[s], teams[_other(s)], rules.counters) for s in SIDES}
    duos = {s: team_duos(teams[s], rules.duos) for s in SIDES}
    for s in SIDES:
        brk[s].counter = sum(b for _, b in counters[s])
        brk[s].duo = DUO_BONUS * len(duos[s])

    tot: dict[Side, int] = {s: brk[s].total() for s in SIDES}
    rating_sum = {s: sum(m.rating for m in teams[s].members) for s in SIDES}
    pareggio = tot["A"] == tot["B"]
    if tot["A"] != tot["B"]:
        win: Side = "A" if tot["A"] > tot["B"] else "B"
    elif rating_sum["A"] != rating_sum["B"]:
        win = "A" if rating_sum["A"] > rating_sum["B"] else "B"
    else:
        win = "A" if rng.random() < 0.5 else "B"
    lose = _other(win)

    remaining = max(8, min(70, round((tot[win] - tot[lose]) / tot[win] * 400)))
    raw: list[dict[str, Any]] = [{"tipo": "ingresso"}]

    queue: list[dict[str, Any]] = []
    ca = [{"da": "A", "rel": r, "bonus": b} for r, b in counters["A"]]
    cb = [{"da": "B", "rel": r, "bonus": b} for r, b in counters["B"]]
    for i in range(max(len(ca), len(cb))):
        queue += ca[i : i + 1] + cb[i : i + 1]

    for i, role in enumerate(ROLES):
        pa, pb = powers["A"][i], powers["B"][i]
        w: Side = "A" if pa >= pb else "B"
        d = abs(pa - pb)
        raw.append({"tipo": "duello", "ruolo": role, "idx": i})
        if d < 8:
            raw.append({"tipo": "attacco", "da": _other(w), "idx": i, "peso": 4})
        raw.append({"tipo": "attacco", "da": w, "idx": i, "peso": 6 + d})
        if i in (2, 4) and queue:
            take = (len(queue) + 1) // 2 if i == 2 else len(queue)
            for c in queue[:take]:
                raw.append({"tipo": "counter", **c, "peso": c["bonus"]})
            queue = queue[take:]
        if i == 5:
            order = (w, _other(w))
            for s in order:
                for (ia, ib), nome in duos[s]:
                    raw.append(
                        {
                            "tipo": "combo",
                            "da": s,
                            "duo": (ia, ib),
                            "nome": nome,
                            "bonus": DUO_BONUS,
                            "peso": DUO_BONUS,
                        }
                    )
    if not any(e.get("peso") and e["da"] == lose for e in raw):
        raw.append({"tipo": "attacco", "da": lose, "idx": 6, "peso": 4})
    raw.append({"tipo": "ko", "da": win, "peso": 10})

    for s in SIDES:
        hits = [e for e in raw if e.get("peso") and e["da"] == s]
        total = 100 if s == win else 100 - remaining
        weight = sum(e["peso"] for e in hits)
        cum = prev = 0
        for e in hits:
            cum += e["peso"]
            now = round(cum / weight * total)
            e["danno"] = now - prev
            prev = now

    kinds = {
        "ingresso": Ingresso,
        "duello": Duello,
        "attacco": Attacco,
        "counter": Counter,
        "combo": Combo,
        "ko": Ko,
    }
    events: list[Event] = []
    for e in raw:
        e.pop("peso", None)
        events.append(kinds[e.pop("tipo")](**e))
    return MatchResult(
        seed=seed, totali=tot, dettaglio=brk, vincitore=win, pareggio=pareggio, eventi=events
    )
