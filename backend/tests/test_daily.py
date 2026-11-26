from fastapi.testclient import TestClient

from app.daily import seed_for, today
from app.db.session import configure
from app.main import app
from tests.test_quick import cheapest_picks

client = TestClient(app)


def test_seed_is_stable_per_day() -> None:
    assert seed_for("2026-11-25") == seed_for("2026-11-25")
    assert seed_for("2026-11-25") != seed_for("2026-11-26")


def test_daily_flow_one_try_per_name_and_ranking(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'd.db'}")
    info = client.get("/api/daily").json()
    assert info["day"] == today() and info["leaderboard"] == []
    body = cheapest_picks(info["draft"]["seed"])
    first = client.post("/api/daily/play", json={"name": "Anna", **body})
    assert first.status_code == 200 and first.json()["rank"] == 1
    again = client.post("/api/daily/play", json={"name": "ANNA", **body})
    assert again.status_code == 409
    second = client.post("/api/daily/play", json={"name": "Bruno", **body})
    assert second.status_code == 200
    board = client.get("/api/daily").json()["leaderboard"]
    assert [r["name"] for r in board] in (["Anna", "Bruno"], ["Bruno", "Anna"])
    assert board[0]["score"] >= board[1]["score"]
    bad = {"name": "C", "picks": [{"id": "x", "role": "Capitano", "hand": 0}] * 7}
    assert client.post("/api/daily/play", json=bad).status_code == 422
