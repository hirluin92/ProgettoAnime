from fastapi.testclient import TestClient

from app.daily import seed_for, today
from app.db.session import configure
from app.main import app
from app.quick import build_options, cost_of

client = TestClient(app)


def cheapest_picks(seed: int) -> list[str]:
    opts = build_options(seed)
    picks: list[str] = []
    for role in opts:
        choice = sorted(opts[role], key=lambda c: (cost_of(c.rating), c.id))
        picks.append(next(c.id for c in choice if c.id not in picks))
    return picks


def test_seed_is_stable_per_day() -> None:
    assert seed_for("2026-11-25") == seed_for("2026-11-25")
    assert seed_for("2026-11-25") != seed_for("2026-11-26")


def test_daily_flow_one_try_per_name_and_ranking(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'd.db'}")
    info = client.get("/api/daily").json()
    assert info["day"] == today() and info["leaderboard"] == []
    picks = cheapest_picks(info["options"]["seed"])
    first = client.post("/api/daily/play", json={"name": "Anna", "picks": picks})
    assert first.status_code == 200 and first.json()["rank"] == 1
    again = client.post("/api/daily/play", json={"name": "ANNA", "picks": picks})
    assert again.status_code == 409
    second = client.post("/api/daily/play", json={"name": "Bruno", "picks": picks})
    assert second.status_code == 200
    board = client.get("/api/daily").json()["leaderboard"]
    assert [r["name"] for r in board] in (["Anna", "Bruno"], ["Bruno", "Anna"])
    assert board[0]["score"] >= board[1]["score"]
    assert client.post("/api/daily/play", json={"name": "C", "picks": ["x"] * 7}).status_code == 422
