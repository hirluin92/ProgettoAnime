import uuid

from fastapi.testclient import TestClient

from app.db.session import configure
from app.main import app
from app.profilo import (
    OBIETTIVI,
    TETTO_PREMI_GIORNO,
    TITOLI,
    livello_per_xp,
    obiettivi_del_giorno,
    stagione_di,
    titolo_per_livello,
    xp_per_livello,
)
from tests.test_quick import cheapest_picks

client = TestClient(app)


def test_levels_are_monotonic_and_consistent() -> None:
    assert livello_per_xp(0) == 1 and livello_per_xp(59) == 1 and livello_per_xp(60) == 2
    assert livello_per_xp(240) == 3 and livello_per_xp(239) == 2
    for lv in range(1, 30):
        assert livello_per_xp(xp_per_livello(lv)) == lv
        assert xp_per_livello(lv + 1) > xp_per_livello(lv)
    assert titolo_per_livello(1) == "Recluta" and titolo_per_livello(99) == TITOLI[-1][1]


def test_daily_objectives_are_stable_and_three() -> None:
    a = obiettivi_del_giorno("2026-11-26")
    assert a == obiettivi_del_giorno("2026-11-26") and len(a) == 3 and len({o.id for o in a}) == 3
    assert len({o.id for d in range(1, 29) for o in obiettivi_del_giorno(f"2026-11-{d:02d}")}) >= 6
    assert set(o.id for o in a) <= set(OBIETTIVI)


def test_season_is_the_month() -> None:
    assert stagione_di("2026-11-26") == "2026-11"


def test_profile_creation_validation_and_rename(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'pr1.db'}")
    p = client.post("/api/profile", json={"name": "Anna"}).json()
    assert p["name"] == "Anna" and p["xp"] == 0 and p["livello"] == 1 and p["titolo"] == "Recluta"
    assert len(p["obiettivi"]) == 3 and p["collezione_totale"] >= 123
    again = client.post("/api/profile", json={"id": p["id"], "name": "Anna B"}).json()
    assert again["id"] == p["id"] and again["name"] == "Anna B"
    assert client.get(f"/api/profile/{p['id']}").json()["name"] == "Anna B"
    assert client.get(f"/api/profile/{uuid.uuid4()}").status_code == 404
    assert client.get("/api/profile/non-un-uuid").status_code == 422
    assert client.post("/api/profile", json={"name": ""}).status_code == 422
    assert client.post("/api/profile", json={"id": "x", "name": "A"}).status_code == 422


def test_playing_awards_xp_collection_and_season(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'pr2.db'}")
    pid = client.post("/api/profile", json={"name": "Anna"}).json()["id"]
    r = client.post("/api/quick/play", json={**cheapest_picks(9), "profile_id": pid}).json()
    prem = r["premio"]
    assert prem is not None and prem["xp"] >= 30 and prem["xp_totale"] == prem["xp"]
    assert prem["nuove_carte"] == 7 and prem["punti_stagione"] in (1, 3)
    p = client.get(f"/api/profile/{pid}").json()
    assert p["partite"] == 1 and len(p["collezione"]) == 7 and p["xp"] == prem["xp"]
    assert p["stagione"]["punti"] == prem["punti_stagione"] and p["stagione"]["posizione"] == 1
    # il bonus del primo gioco del giorno si prende una volta sola
    r2 = client.post("/api/quick/play", json={**cheapest_picks(9), "profile_id": pid}).json()
    assert r2["premio"]["nuove_carte"] == 0
    assert r2["premio"]["xp"] <= prem["xp"] - 10 + 20 * 3
    assert client.get(f"/api/profile/{pid}").json()["partite"] == 2


def test_no_profile_no_prize_and_bad_id_is_ignored(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'pr3.db'}")
    assert client.post("/api/quick/play", json=cheapest_picks(9)).json()["premio"] is None
    bad = client.post("/api/quick/play", json={**cheapest_picks(9), "profile_id": "ciao"}).json()
    assert bad["premio"] is None
    ghost = str(uuid.uuid4())  # id valido ma mai creato: nessun premio e nessun profilo fantasma
    assert (
        client.post("/api/quick/play", json={**cheapest_picks(9), "profile_id": ghost}).json()[
            "premio"
        ]
        is None
    )
    assert client.get(f"/api/profile/{ghost}").status_code == 404


def test_objectives_award_only_once_per_day(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'pr4.db'}")
    pid = client.post("/api/profile", json={"name": "Anna"}).json()["id"]
    done: set[str] = set()
    for seed in range(1, TETTO_PREMI_GIORNO - 4):
        r = client.post("/api/quick/play", json={**cheapest_picks(seed), "profile_id": pid}).json()
        ids = {o["id"] for o in r["premio"]["obiettivi_completati"]}
        assert not (ids & done)  # mai due volte lo stesso obiettivo nello stesso giorno
        done |= ids
    p = client.get(f"/api/profile/{pid}").json()
    assert {o["id"] for o in p["obiettivi"] if o["fatto"]} == done and done


def test_daily_challenge_gives_season_points_and_xp(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'pr5.db'}")
    pid = client.post("/api/profile", json={"name": "Anna"}).json()["id"]
    info = client.get("/api/daily").json()
    body = {**cheapest_picks(info["draft"]["seed"]), "name": "Anna", "profile_id": pid}
    r = client.post("/api/daily/play", json=body).json()
    assert r["play"]["premio"]["xp"] >= 45  # 20 base + 25 sfida
    assert r["play"]["premio"]["punti_stagione"] == max(1, r["score"] // 10)
    top = client.get("/api/season").json()
    assert top["top"][0]["name"] == "Anna" and top["season"]


def test_season_ranking_orders_by_points(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'pr6.db'}")
    a = client.post("/api/profile", json={"name": "Anna"}).json()["id"]
    b = client.post("/api/profile", json={"name": "Bruno"}).json()["id"]
    for seed in (1, 2, 3):
        client.post("/api/quick/play", json={**cheapest_picks(seed), "profile_id": a})
    client.post("/api/quick/play", json={**cheapest_picks(1), "profile_id": b})
    top = client.get("/api/season").json()["top"]
    assert [t["name"] for t in top] == ["Anna", "Bruno"] and top[0]["points"] > top[1]["points"]
    assert client.get(f"/api/profile/{b}").json()["stagione"]["posizione"] == 2


def test_collection_lists_every_character_and_form() -> None:
    items = client.get("/api/collection").json()
    assert len(items) >= 123
    assert len({i["id"] for i in items}) == len(items)
    assert any(i["forma"] for i in items) and any(not i["forma"] for i in items)


def test_premi_hanno_un_tetto_giornaliero(tmp_path) -> None:  # type: ignore[no-untyped-def]
    """Ripetere la stessa richiesta non dà premi all'infinito: oltre il tetto niente premio."""
    configure(f"sqlite:///{tmp_path / 'tetto.db'}")
    pid = client.post("/api/profile", json={"name": "Anna"}).json()["id"]
    corpo = {**cheapest_picks(9), "profile_id": pid}
    premiate = 0
    for _ in range(TETTO_PREMI_GIORNO + 3):
        if client.post("/api/quick/play", json=corpo).json()["premio"] is not None:
            premiate += 1
    assert premiate == TETTO_PREMI_GIORNO
    p = client.get(f"/api/profile/{pid}").json()
    assert p["partite"] == TETTO_PREMI_GIORNO


def test_giorno_italiano_cambia_a_mezzanotte_italiana() -> None:
    from datetime import UTC, datetime

    from app.tempo import giorno_italia

    # inverno (UTC+1): le 23:30 UTC sono già il giorno dopo
    assert giorno_italia(datetime(2026, 1, 10, 22, 59, tzinfo=UTC)) == "2026-01-10"
    assert giorno_italia(datetime(2026, 1, 10, 23, 0, tzinfo=UTC)) == "2026-01-11"
    # estate (UTC+2): cambia alle 22:00 UTC
    assert giorno_italia(datetime(2026, 7, 10, 21, 59, tzinfo=UTC)) == "2026-07-10"
    assert giorno_italia(datetime(2026, 7, 10, 22, 0, tzinfo=UTC)) == "2026-07-11"
    # il passaggio all'ora legale 2026: domenica 29 marzo alle 01:00 UTC
    assert giorno_italia(datetime(2026, 3, 28, 22, 59, tzinfo=UTC)) == "2026-03-28"
    assert giorno_italia(datetime(2026, 3, 28, 23, 0, tzinfo=UTC)) == "2026-03-29"
    assert giorno_italia(datetime(2026, 3, 29, 21, 59, tzinfo=UTC)) == "2026-03-29"
    assert giorno_italia(datetime(2026, 3, 29, 22, 0, tzinfo=UTC)) == "2026-03-30"
    # ritorno all'ora solare 2026: domenica 25 ottobre
    assert giorno_italia(datetime(2026, 10, 24, 21, 59, tzinfo=UTC)) == "2026-10-24"
    assert giorno_italia(datetime(2026, 10, 24, 22, 0, tzinfo=UTC)) == "2026-10-25"
    assert giorno_italia(datetime(2026, 10, 25, 22, 59, tzinfo=UTC)) == "2026-10-25"
    assert giorno_italia(datetime(2026, 10, 25, 23, 0, tzinfo=UTC)) == "2026-10-26"
