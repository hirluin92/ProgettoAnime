from fastapi.testclient import TestClient

from app.db.session import configure
from app.main import app
from tests.test_quick import cheapest_picks

client = TestClient(app)


def test_phase_preview_and_final_consistency(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'vf.db'}")
    seed = 12
    picks = cheapest_picks(seed)["picks"]
    base = {"seed": seed, "picks": picks, "carica": "subito", "formazione": "classica"}
    r1 = client.post("/api/quick/fase", json={**base, "tattiche": ["assalto"]})
    assert r1.status_code == 200, r1.text
    f1 = r1.json()
    assert f1["fase"] == 1 and len(f1["cpu"]) == 1 and len(f1["confronti"]) == 1
    assert len(f1["membri"]["A"]) == 7 and all(0 <= m["hp_pct"] <= 100 for m in f1["membri"]["A"])
    # le fasi future non rivelate: stessa risposta qualunque sia la scelta futura (non c'è input)
    f2 = client.post("/api/quick/fase", json={**base, "tattiche": ["assalto", "guardia"]}).json()
    assert f2["fase"] == 2 and f2["cpu"][0] == f1["cpu"][0]
    # il risultato finale è coerente con l'anteprima: la CPU gioca le stesse tattiche
    full = client.post(
        "/api/quick/play",
        json={**base, "tattiche": ["assalto", "guardia", "tecnica"]},
    ).json()
    assert full["result"]["tattiche"]["B"][:2] == f2["cpu"]
    assert 2 <= len(full["perche"]) <= 6 and any("Tattiche" in x for x in full["perche"])
    # tattiche non valide
    assert client.post("/api/quick/fase", json={**base, "tattiche": ["boh"]}).status_code == 422
    assert client.post("/api/quick/fase", json={**base, "tattiche": []}).status_code == 422
