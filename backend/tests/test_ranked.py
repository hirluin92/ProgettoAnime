import random

from fastapi.testclient import TestClient

from app import ranked
from app.db.models import ProfileRow, RankedGhost
from app.db.session import configure, session_scope
from app.main import app
from app.ranked import SOGLIE_SETTIMANA, gradino, lega_di, nuovo_mmr
from tests.test_duello_api import mosse_valide

client = TestClient(app)


def giocatore(nome: str, utente: str | None = "auto") -> str:
    pid = client.post("/api/profile", json={"name": nome}).json()["id"]
    if utente:
        u = nome.lower() if utente == "auto" else utente
        r = client.post(
            "/api/account/registra",
            json={"profile_id": pid, "username": u, "password": "password1"},
        )
        assert r.status_code == 200, r.text
    return pid


def partita_ranked(pid: str, rnd: random.Random, passa: bool = False) -> dict:  # type: ignore[type-arg]
    st = client.post(f"/api/ranked/{pid}/start").json()
    d = client.get(f"/api/duello/draft?seed={st['seed']}").json()
    picks = [{"id": d["mani"][i][0]["id"], "hand": i} for i in range(8)]
    g = client.post(f"/api/ranked/partita/{st['ranked_id']}/inizia", json={"picks": picks})
    assert g.status_code == 200, g.text
    g = g.json()
    stato = g["stato"]
    out: dict = {}  # type: ignore[type-arg]
    for _ in range(6):
        mosse = [] if passa else mosse_valide(stato, rnd)
        out = client.post(f"/api/duello/{g['id']}/turno", json={"mosse": mosse}).json()
        stato = out["stato"]
    out["avversario"] = st["avversario"]
    return out


def test_leagues_and_steps() -> None:
    assert lega_di(1000) == ("Argento", "II")
    assert lega_di(700) == ("Bronzo", "IV") and lega_di(100) == ("Bronzo", "IV")
    assert lega_di(899) == ("Bronzo", "I") and lega_di(900) == ("Argento", "IV")
    assert lega_di(1699) == ("Diamante", "I") and lega_di(1700) == ("Campione", None)
    assert lega_di(5000) == ("Campione", None)
    assert [gradino(m) for m in (0, 700, 750, 1700, 3000)] == [0, 0, 1, 20, 20]


def test_mmr_update_is_zero_sum_symmetric_and_larger_in_placement() -> None:
    assert nuovo_mmr(1000, 1000, 1.0, 10) == 1012 and nuovo_mmr(1000, 1000, 0.0, 10) == 988
    assert nuovo_mmr(1000, 1000, 1.0, 0) == 1024  # piazzamento: K doppio
    assert nuovo_mmr(1000, 1400, 1.0, 10) > nuovo_mmr(1000, 1000, 1.0, 10)  # batti uno più forte
    assert nuovo_mmr(1000, 1000, 0.5, 10) == 1000


def test_account_required_and_full_ranked_game(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'r1.db'}")
    anonimo = giocatore("Anon", utente=None)
    assert client.post(f"/api/ranked/{anonimo}/start").status_code == 403
    pid = giocatore("Anna")
    s0 = client.get(f"/api/ranked/{pid}").json()
    assert s0["mmr"] == 1000 and s0["in_piazzamento"] and s0["piazzamento_rimaste"] == 5
    out = partita_ranked(pid, random.Random(1))
    assert out["finita"] and out["ranked"]["mmr_prima"] == 1000 and out["ranked"]["in_piazzamento"]
    assert out["ranked"]["mmr_dopo"] != 1000 or out["vinto"] is None
    s1 = client.get(f"/api/ranked/{pid}").json()
    assert s1["partite"] == 1 and s1["partite_settimana"] == 1 and s1["piazzamento_rimaste"] == 4
    assert s1["mmr"] == out["ranked"]["mmr_dopo"]
    # il draft deve corrispondere al seme: una scelta non valida è rifiutata
    st = client.post(f"/api/ranked/{pid}/start").json()
    cattivi = [{"id": "nope", "hand": i} for i in range(8)]
    assert (
        client.post(
            f"/api/ranked/partita/{st['ranked_id']}/inizia", json={"picks": cattivi}
        ).status_code
        == 422
    )
    # una partita si inizia una volta sola
    d = client.get(f"/api/duello/draft?seed={st['seed']}").json()
    ok = [{"id": d["mani"][i][0]["id"], "hand": i} for i in range(8)]
    assert (
        client.post(f"/api/ranked/partita/{st['ranked_id']}/inizia", json={"picks": ok}).status_code
        == 200
    )
    assert (
        client.post(f"/api/ranked/partita/{st['ranked_id']}/inizia", json={"picks": ok}).status_code
        == 404
    )


def test_ghosts_become_opponents_of_other_players(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'r2.db'}")
    anna, bruno = giocatore("Anna"), giocatore("Bruno")
    primo = client.post(f"/api/ranked/{anna}/start").json()
    assert primo["avversario"]["fantasma"] is False and primo["avversario"]["nome"] == "Sfidante"
    partita_ranked(anna, random.Random(2))  # il mazzo di Anna diventa un fantasma
    with session_scope() as s:
        assert s.query(RankedGhost).filter_by(profile_id=anna).count() == 1
    # Bruno (stesso livello) incontra il fantasma di Anna; Anna non incontra il proprio
    visto = {
        client.post(f"/api/ranked/{bruno}/start").json()["avversario"]["nome"] for _ in range(5)
    }
    assert visto == {"Anna"}
    assert client.post(f"/api/ranked/{anna}/start").json()["avversario"]["nome"] == "Sfidante"


def test_ghosts_are_capped_per_player(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'r3.db'}")
    pid = giocatore("Carla")
    rnd = random.Random(3)
    for _ in range(ranked.MAX_FANTASMI + 2):
        partita_ranked(pid, rnd, passa=True)
    with session_scope() as s:
        assert s.query(RankedGhost).filter_by(profile_id=pid).count() == ranked.MAX_FANTASMI
    assert client.get(f"/api/ranked/{pid}").json()["piazzamento_rimaste"] == 0


def test_weekly_goals_unlock_and_pay_once(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'r4.db'}")
    pid = giocatore("Dario")
    assert client.post(f"/api/ranked/{pid}/ritira", json={"partite": 5}).status_code == 409
    rnd = random.Random(4)
    for _ in range(5):
        partita_ranked(pid, rnd, passa=True)
    stato = client.get(f"/api/ranked/{pid}").json()
    assert stato["partite_settimana"] == 5 and stato["soglie"][0]["raggiunta"]
    assert not stato["soglie"][1]["raggiunta"]
    prima = client.get(f"/api/profile/{pid}").json()["crediti"]
    r = client.post(f"/api/ranked/{pid}/ritira", json={"partite": 5})
    assert r.status_code == 200 and r.json()["crediti"] == SOGLIE_SETTIMANA[5]
    assert client.get(f"/api/profile/{pid}").json()["crediti"] == prima + SOGLIE_SETTIMANA[5]
    assert client.post(f"/api/ranked/{pid}/ritira", json={"partite": 5}).status_code == 409
    assert client.post(f"/api/ranked/{pid}/ritira", json={"partite": 10}).status_code == 409
    assert client.post(f"/api/ranked/{pid}/ritira", json={"partite": 7}).status_code == 422


def test_leaderboard_only_lists_accounts_after_placement(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'r5.db'}")
    pid = giocatore("Elena")
    assert client.get(f"/api/ranked/{pid}").json()["classifica"] == []
    with session_scope() as s:
        row = s.get(ProfileRow, pid)
        row.ranked_partite, row.mmr = 5, 1650  # type: ignore[union-attr]
    c = client.get(f"/api/ranked/{pid}").json()["classifica"]
    assert [r["nome"] for r in c] == ["Elena"] and c[0]["lega"] == "Diamante"
