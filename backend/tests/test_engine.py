import random
from collections import Counter as Tally
from pathlib import Path

from fastapi.testclient import TestClient

from app.data_loader import load_characters, load_ruleset, validate
from app.engine.models import Combo, Counter, Team
from app.engine.rng import Rng
from app.engine.simulate import simulate
from app.main import app

CHARS = list(load_characters().values())
RULES = load_ruleset()


def random_team(rnd: random.Random, name: str) -> Team:
    return Team(nome=name, members=rnd.sample(CHARS, 7))


def damages(result, side):  # type: ignore[no-untyped-def]
    return [e.danno for e in result.eventi if getattr(e, "da", None) == side]


def test_data_valid() -> None:
    assert validate() == []
    assert len(CHARS) >= 20


def test_rng_deterministic_and_in_range() -> None:
    a, b = Rng(42), Rng(42)
    seq = [a.random() for _ in range(5)]
    assert seq == [b.random() for _ in range(5)]
    assert all(0 <= x < 1 for x in seq)
    assert {Rng(i).randint(0, 12) for i in range(200)} <= set(range(13))


def test_determinism() -> None:
    rnd = random.Random(1)
    a, b = random_team(rnd, "A"), random_team(rnd, "B")
    r1 = simulate(a, b, 123, RULES).model_dump_json()
    assert r1 == simulate(a, b, 123, RULES).model_dump_json()
    assert r1 != simulate(a, b, 124, RULES).model_dump_json()


def test_damage_sums_and_non_negative() -> None:
    rnd = random.Random(2)
    for seed in range(500):
        res = simulate(random_team(rnd, "A"), random_team(rnd, "B"), seed, RULES)
        lose = "B" if res.vincitore == "A" else "A"
        assert sum(damages(res, res.vincitore)) == 100
        assert 8 <= 100 - sum(damages(res, lose)) <= 70
        assert all(d >= 0 for s in ("A", "B") for d in damages(res, s))
        assert res.eventi[0].tipo == "ingresso" and res.eventi[-1].tipo == "ko"
        assert res.totali[res.vincitore] >= res.totali["B" if res.vincitore == "A" else "A"]
        assert res.totali["A"] == res.dettaglio["A"].total()


def test_counters_and_duos_appear() -> None:
    rnd = random.Random(3)
    seen_counter = seen_combo = False
    for seed in range(300):
        res = simulate(random_team(rnd, "A"), random_team(rnd, "B"), seed, RULES)
        seen_counter |= any(isinstance(e, Counter) for e in res.eventi)
        seen_combo |= any(isinstance(e, Combo) for e in res.eventi)
    assert seen_counter and seen_combo


def test_balance_report() -> None:
    rnd = random.Random(2026)
    wins: Tally[str] = Tally()
    n = 10_000
    for seed in range(n):
        a, b = random_team(rnd, "A"), random_team(rnd, "B")
        res = simulate(a, b, seed, RULES)
        for m in (a if res.vincitore == "A" else b).members:
            wins[m.id] += 1
    rows = sorted(((wins[c.id] / n, c) for c in CHARS), key=lambda x: -x[0])
    lines = [
        "# Report di bilanciamento",
        "",
        f"{n} scontri tra squadre casuali.",
        "",
        "| Personaggio | Rating | Presenza nelle squadre vincenti |",
        "| --- | --- | --- |",
    ]
    lines += [f"| {c.nome} | {c.rating} | {p:.1%} |" for p, c in rows]
    Path(__file__).with_name("balance_report.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )
    assert rows[0][0] <= 0.70


def test_api_simulate() -> None:
    client = TestClient(app)
    ids = [c.id for c in CHARS]
    body = {"team_a": ids[:7], "team_b": ids[7:14], "seed": 5}
    r = client.post("/api/simulate", json=body)
    assert r.status_code == 200 and r.json() == client.post("/api/simulate", json=body).json()
    assert client.post("/api/simulate", json={**body, "team_a": ["x"] * 7}).status_code == 422


def test_match_persistence(tmp_path) -> None:  # type: ignore[no-untyped-def]
    from app.db import repo
    from app.db.session import configure

    configure(f"sqlite:///{tmp_path / 't.db'}")
    client = TestClient(app)
    stored = client.post("/api/dev/random-match").json()
    got = client.get(f"/api/matches/{stored['id']}")
    assert got.status_code == 200 and got.json() == stored["result"]
    assert client.get("/api/matches/nope").status_code == 404
    assert repo.get_match("nope") is None


def test_dev_endpoints_disabled_without_dev_tools(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("DEV_TOOLS", "0")
    client = TestClient(app)
    assert client.post("/api/dev/random-match").status_code == 404
    assert client.post("/api/dev/fake-chat/ABCDE", json={"messages": []}).status_code == 404
