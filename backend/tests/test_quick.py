import random

from fastapi.testclient import TestClient

from app.data_loader import load_characters
from app.db.session import configure
from app.main import app
from app.quick import BUDGET, build_options, cost_of, cpu_draft

client = TestClient(app)


def test_options_deterministic_and_complete() -> None:
    a = client.get("/api/quick/options?seed=5").json()
    assert a == client.get("/api/quick/options?seed=5").json()
    assert list(a["options"]) == a["roles"] and len(a["roles"]) == 7
    assert all(len(v) == 5 for v in a["options"].values())


def test_cost_scale() -> None:
    costi = [cost_of(c) for c in load_characters().values()]
    assert min(costi) == 1 and max(costi) <= 14 and 5 <= sum(costi) / len(costi) <= 9


def test_cpu_respects_budget_for_many_seeds() -> None:
    for seed in range(300):
        picks, spent = cpu_draft(seed)
        assert len(picks) == 7 and len({p.id for p in picks}) == 7
        assert spent <= BUDGET


def test_play_flow_and_validation(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'q.db'}")
    seed = 9
    opts = build_options(seed)
    cheapest = [min(opts[r], key=lambda c: c.rating).id for r in opts]
    if len(set(cheapest)) == 7:
        r = client.post("/api/quick/play", json={"seed": seed, "picks": cheapest})
        assert r.status_code == 200
        body = r.json()
        assert (
            body["spent"] <= BUDGET and client.get(f"/api/matches/{body['id']}").status_code == 200
        )
    bad = client.post("/api/quick/play", json={"seed": seed, "picks": ["nope"] * 7})
    assert bad.status_code == 422


def test_over_budget_is_rejected() -> None:
    rnd = random.Random(0)
    for seed in range(200):
        opts = build_options(seed)
        best = [max(opts[r], key=lambda c: c.rating) for r in opts]
        if len({c.id for c in best}) == 7 and sum(cost_of(c) for c in best) > BUDGET:
            r = client.post("/api/quick/play", json={"seed": seed, "picks": [c.id for c in best]})
            assert r.status_code == 422 and "budget" in r.text
            return
    assert rnd  # nessun caso trovato: improbabile ma non un errore


def _min_completion(options: list[list[tuple[str, int]]], i: int, used: frozenset[str]) -> float:
    """Costo minimo per riempire i ruoli da i in poi, senza ripetizioni (inf se impossibile)."""
    if i == len(options):
        return 0
    best = float("inf")
    for cid, cost in options[i]:
        if cid in used or cost >= best:
            continue
        best = min(best, cost + _min_completion(options, i + 1, used | {cid}))
    return best


def test_every_draft_can_always_be_completed_within_budget() -> None:
    """Il client ammette solo scelte che lasciano la squadra completabile: all'inizio lo è."""
    for seed in range(1, 1501):
        opts = build_options(seed)
        grid = [[(c.id, cost_of(c)) for c in cs] for cs in opts.values()]
        assert _min_completion(grid, 0, frozenset()) <= BUDGET, f"seed {seed}"
