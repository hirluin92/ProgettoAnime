from fastapi.testclient import TestClient

from app.album import MAX_COSTO, errori_mazzo, rarita
from app.data_loader import load_characters, load_forms
from app.db.models import ProfileRow
from app.db.session import configure, session_scope
from app.duello_api import _tutte
from app.main import app

client = TestClient(app)


def profilo_con(carte: list[str], tmp_path, nome: str = "a.db") -> str:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / nome}")
    pid = client.post("/api/profile", json={"name": "Anna"}).json()["id"]
    with session_scope() as s:
        s.get(ProfileRow, pid).collezione = carte  # type: ignore[union-attr]
    return pid


def economiche(n: int) -> list[str]:
    """Carte comuni e a basso costo, per mazzi validi."""
    tutte = [c for c, _ in _tutte().values() if rarita(c.rating) == "comune" and c.costo <= 3]
    return [c.id for c in tutte[:n]]


def test_rarity_thresholds_and_catalog_size() -> None:
    assert [rarita(r) for r in (60, 72, 82, 90)] == ["comune", "rara", "epica", "leggendaria"]
    assert len(_tutte()) == len(load_characters()) + len(load_forms())


def test_album_lists_everything_and_marks_owned(tmp_path) -> None:  # type: ignore[no-untyped-def]
    mie = economiche(5)
    pid = profilo_con(mie, tmp_path)
    a = client.get(f"/api/album/{pid}").json()
    assert a["totale"] == len(_tutte()) and a["posseduti"] == 5
    assert {x["carta"]["id"] for x in a["carte"] if x["posseduta"]} == set(mie)
    assert a["limiti"]["mazzo"] == 8 and a["mazzi"] == []
    assert client.get("/api/album/non-un-uuid").status_code == 422
    assert client.get("/api/album/00000000-0000-4000-8000-000000000000").status_code == 404


def test_deck_rules() -> None:
    tutte = list(_tutte().values())
    comuni = [c.id for c, _ in tutte if rarita(c.rating) == "comune" and c.costo <= 3]
    assert errori_mazzo(comuni[:8], set(comuni)) == []
    assert any("esattamente" in e for e in errori_mazzo(comuni[:7], set(comuni)))
    assert any("ripetute" in e for e in errori_mazzo([comuni[0]] * 8, set(comuni)))
    assert any("possiedi" in e for e in errori_mazzo(comuni[:8], set(comuni[:5])))
    assert any("sconosciute" in e for e in errori_mazzo([*comuni[:7], "nope"], set(comuni)))
    legg = [c.id for c, _ in tutte if rarita(c.rating) == "leggendaria"]
    assert any(
        "leggendarie" in e for e in errori_mazzo([*legg[:3], *comuni[:5]], set(legg) | set(comuni))
    )
    cari = sorted((c for c, _ in tutte), key=lambda c: -c.costo)[:8]
    ids = [c.id for c in cari]
    assert sum(c.costo for c in cari) > MAX_COSTO
    assert any("costo" in e for e in errori_mazzo(ids, set(ids)))


def test_save_decks_and_play_with_one(tmp_path) -> None:  # type: ignore[no-untyped-def]
    mie = economiche(10)
    pid = profilo_con(mie, tmp_path, "a2.db")
    ok = {"mazzi": [{"nome": "Il mio", "carte": mie[:8]}]}
    assert client.put(f"/api/album/{pid}/mazzi", json=ok).status_code == 200
    assert client.get(f"/api/album/{pid}").json()["mazzi"][0]["nome"] == "Il mio"
    # carta non posseduta: rifiutato, e il salvato resta com'era
    cattivo = {"mazzi": [{"nome": "X", "carte": [*mie[:7], "son-goku"]}]}
    r = client.put(f"/api/album/{pid}/mazzi", json=cattivo)
    assert r.status_code == 422 and "possiedi" in r.text
    assert client.get(f"/api/album/{pid}").json()["mazzi"][0]["nome"] == "Il mio"
    # una partita con il mazzo personale
    g = client.post(
        "/api/duello/start-personale", json={"profile_id": pid, "mazzo": 0, "livello": "facile"}
    )
    assert g.status_code == 200, g.text
    assert {c["id"] for c in g.json()["stato"]["mano"]} <= set(mie[:8])
    assert (
        client.post("/api/duello/start-personale", json={"profile_id": pid, "mazzo": 3}).status_code
        == 404
    )
    # finire la partita: XP sì, ELO no
    gid = g.json()["id"]
    from tests.test_duello_api import finisci

    out = finisci(gid, g.json()["stato"])
    assert out["premio"]["xp"] >= 20 and out["premio"]["elo_prima"] == out["premio"]["elo_dopo"]
    assert client.get(f"/api/profile/{pid}").json()["elo"] == 1200
