import random
from collections import Counter

from fastapi.testclient import TestClient

from app.album import rarita
from app.db.models import ProfileRow
from app.db.session import configure, session_scope
from app.main import app
from app.pacchetti import PITY_MAX, RARITA, RIMBORSO, TIPI, estrai

client = TestClient(app)


def profilo(tmp_path, crediti: int, nome: str, coll: list[str] | None = None) -> str:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / nome}")
    pid = client.post("/api/profile", json={"name": "Anna"}).json()["id"]
    with session_scope() as s:
        row = s.get(ProfileRow, pid)
        row.crediti = crediti  # type: ignore[union-attr]
        row.collezione = coll or []  # type: ignore[union-attr]
    return pid


def test_shop_lists_prices_and_public_odds() -> None:
    n = client.get("/api/pacchetti").json()
    assert [t["id"] for t in n["tipi"]] == ["base", "argento", "oro", "leggendario"]
    for t in n["tipi"]:
        assert abs(sum(t["probabilita"].values()) - 100) < 1e-9
        assert sum(t["carte_per_rarita"].values()) == 123 and t["prezzo"] > 0
    assert n["pity_max"] == PITY_MAX and set(n["rimborso"]) == set(RARITA)
    prezzi = [t["prezzo"] for t in n["tipi"]]
    assert prezzi == sorted(prezzi)


def test_observed_rates_match_the_published_odds() -> None:
    rng = random.Random(1)
    base = TIPI["base"]
    c: Counter[str] = Counter()
    n = 20000
    for _ in range(n):
        for carta in estrai(base, 0, rng)[0]:
            c[rarita(carta.rating)] += 1
    tot = sum(c.values())
    for r, peso in zip(RARITA, base.pesi, strict=True):
        assert abs(100 * c[r] / tot - peso) < 1.2, (r, c[r] / tot)


def test_guarantees_always_hold() -> None:
    rng = random.Random(2)
    ordine = {r: i for i, r in enumerate(RARITA)}
    for tid in ("argento", "oro", "leggendario"):
        t = TIPI[tid]
        for _ in range(3000):
            carte, _ = estrai(t, 0, rng)
            assert len(carte) == t.carte
            assert max(ordine[rarita(x.rating)] for x in carte) >= ordine[t.garantita]  # type: ignore[index]


def test_pity_forces_a_legendary_at_the_limit() -> None:
    rng = random.Random(3)
    for _ in range(200):
        carte, forzata = estrai(TIPI["base"], PITY_MAX - 1, rng)
        assert any(rarita(c.rating) == "leggendaria" for c in carte)
    assert estrai(TIPI["base"], 0, random.Random(4))[1] is False


def test_opening_charges_credits_adds_cards_and_refunds_duplicates(tmp_path) -> None:  # type: ignore[no-untyped-def]
    pid = profilo(tmp_path, 1000, "p1.db")
    r = client.post(f"/api/pacchetti/{pid}/apri", json={"tipo": "base"})
    assert r.status_code == 200, r.text
    a = r.json()
    assert len(a["carte"]) == 3 and a["spesi"] == 100
    assert a["crediti"] == 1000 - 100 + a["rimborsati"]
    p = client.get(f"/api/profile/{pid}").json()
    assert p["crediti"] == a["crediti"] and set(p["collezione"]) == {
        c["carta"]["id"] for c in a["carte"]
    }
    # ogni doppione rimborsa secondo la rarità, mai le carte nuove
    for c in a["carte"]:
        assert (c["rimborso"] == 0) == c["nuova"] or c["rimborso"] == RIMBORSO[c["rarita"]]
    # una seconda apertura con la stessa collezione: i già posseduti si rimborsano
    posseduti = set(p["collezione"])
    b = client.post(f"/api/pacchetti/{pid}/apri", json={"tipo": "base"}).json()
    for c in b["carte"]:
        if c["carta"]["id"] in posseduti:
            assert not c["nuova"] and c["rimborso"] == RIMBORSO[c["rarita"]]


def test_not_enough_credits_changes_nothing(tmp_path) -> None:  # type: ignore[no-untyped-def]
    pid = profilo(tmp_path, 99, "p2.db")
    r = client.post(f"/api/pacchetti/{pid}/apri", json={"tipo": "base"})
    assert r.status_code == 402
    p = client.get(f"/api/profile/{pid}").json()
    assert p["crediti"] == 99 and p["collezione"] == []
    assert client.post(f"/api/pacchetti/{pid}/apri", json={"tipo": "boh"}).status_code == 404
    assert client.post("/api/pacchetti/non-uuid/apri", json={"tipo": "base"}).status_code == 422
    assert (
        client.post(
            "/api/pacchetti/00000000-0000-4000-8000-000000000000/apri", json={"tipo": "base"}
        ).status_code
        == 404
    )


def test_credits_are_earned_by_playing_only(tmp_path) -> None:  # type: ignore[no-untyped-def]
    from tests.test_duello_api import avvia

    configure(f"sqlite:///{tmp_path / 'p3.db'}")
    pid = client.post("/api/profile", json={"name": "Elena"}).json()["id"]
    assert client.get(f"/api/profile/{pid}").json()["crediti"] == 0
    g = avvia(31, "facile", pid)
    from tests.test_duello_api import finisci

    out = finisci(g["id"], g["stato"])
    pr = out["premio"]
    assert (
        pr["crediti"] >= 10 and client.get(f"/api/profile/{pid}").json()["crediti"] == pr["crediti"]
    )
    # nessuna API permette di aggiungere crediti
    assert (
        client.post("/api/profile", json={"id": pid, "name": "Elena", "crediti": 9999}).json()[
            "crediti"
        ]
        == pr["crediti"]
    )
