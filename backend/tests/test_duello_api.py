import random

from fastapi.testclient import TestClient

from app.db.session import configure
from app.duello_api import MANI, MAZZO, PARTITE, mazzo_cpu
from app.main import app

client = TestClient(app)


def picks(seed: int, rilanci: int = 0) -> list[dict]:  # type: ignore[type-arg]
    """Un draft valido: la prima carta di ogni mano, con `rilanci` mani saltate in testa."""
    d = client.get(f"/api/duello/draft?seed={seed}").json()
    out = []
    h = rilanci
    for _ in range(MAZZO):
        out.append({"id": d["mani"][h][0]["id"], "hand": h})
        h += 1
    return out


def avvia(seed: int = 5, livello: str = "normale", profile_id: str | None = None) -> dict:  # type: ignore[type-arg]
    r = client.post(
        "/api/duello/start",
        json={"seed": seed, "picks": picks(seed), "livello": livello, "profile_id": profile_id},
    )
    assert r.status_code == 200, r.text
    return r.json()


def mosse_valide(stato: dict, rnd: random.Random) -> list[dict]:  # type: ignore[type-arg]
    budget = stato["energia"]
    nuove = [len(stato["corsie"][c][0]) for c in range(3)]
    out = []
    for carta in list(stato["mano"]):
        c = rnd.randrange(3)
        costo = carta["costo"] + (1 if stato["luoghi"][c]["id"] == "gravita" else 0)
        limite = 3 if stato["luoghi"][c]["id"] == "ghiaccio" else 4
        if costo <= budget and nuove[c] < limite and rnd.random() < 0.8:
            out.append({"carta": carta["id"], "corsia": c})
            budget -= costo
            nuove[c] += 1
    return out


def finisci(gid: str, stato: dict, vuote: bool = False) -> dict:  # type: ignore[type-arg]
    """Gioca i 6 turni: a ogni turno prova le carte dalla più economica, in ogni corsia."""
    out: dict = {}  # type: ignore[type-arg]
    for _ in range(6):
        out = {}
        if not vuote:
            for c in sorted(stato["mano"], key=lambda c: c["costo"]):
                for corsia in range(3):
                    r = client.post(
                        f"/api/duello/{gid}/turno",
                        json={"mosse": [{"carta": c["id"], "corsia": corsia}]},
                    )
                    if r.status_code == 200:
                        out = r.json()
                        break
                if out:
                    break
        if not out:
            out = client.post(f"/api/duello/{gid}/turno", json={"mosse": []}).json()
        stato = out["stato"]
    return out


def test_draft_is_deterministic_and_complete() -> None:
    a = client.get("/api/duello/draft?seed=3").json()
    assert a == client.get("/api/duello/draft?seed=3").json()
    assert a["mazzo"] == MAZZO and len(a["mani"]) == MANI and all(len(m) == 5 for m in a["mani"])
    c = a["mani"][0][0]
    assert c["testo_mossa"] and c["testo_passiva"] and 1 <= c["costo"] <= 6 and c["potenza"] >= 1


def test_start_validates_the_draft() -> None:
    seed = 4
    ok = picks(seed)
    base = {"seed": seed, "livello": "normale"}
    assert client.post("/api/duello/start", json={**base, "picks": ok}).status_code == 200
    assert client.post("/api/duello/start", json={**base, "picks": ok[:-1]}).status_code == 422
    brutto = [dict(p) for p in ok]
    brutto[0]["id"] = "nope"
    assert client.post("/api/duello/start", json={**base, "picks": brutto}).status_code == 422
    troppi = ok[:-1] + [{"id": ok[-1]["id"], "hand": MANI + 2}]
    assert client.post("/api/duello/start", json={**base, "picks": troppi}).status_code == 422
    assert (
        client.post("/api/duello/start", json={**base, "picks": ok, "livello": "boh"}).status_code
        == 422
    )
    con_rilanci = picks(seed, rilanci=2)
    assert client.post("/api/duello/start", json={**base, "picks": con_rilanci}).status_code == 200


def test_cpu_deck_is_valid() -> None:
    for seed in range(60):
        m = mazzo_cpu(seed)
        assert len(m) == MAZZO and len({c.id for c in m}) == MAZZO


def test_full_game_against_each_level(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'du1.db'}")
    rnd = random.Random(1)
    for livello in ("facile", "normale", "difficile"):
        g = avvia(7, livello)
        st = g["stato"]
        assert st["turno"] == 1 and len(st["mano"]) == 3 and st["energia"] == 1
        assert len(st["luoghi"]) == 3 and all(x["regola"] for x in st["luoghi"])
        for t in range(1, 7):
            r = client.post(f"/api/duello/{g['id']}/turno", json={"mosse": mosse_valide(st, rnd)})
            assert r.status_code == 200, r.text
            out = r.json()
            assert any(e["t"] == "punteggi" for e in out["eventi"])
            st = out["stato"]
            assert out["finita"] == (t == 6)
        assert out["vinto"] in (True, False, None) and st["finita"]
        assert client.post(f"/api/duello/{g['id']}/turno", json={"mosse": []}).status_code == 409
        assert client.get(f"/api/duello/{g['id']}").json()["stato"]["finita"]


def test_reveal_events_carry_card_data(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'du2.db'}")
    # un seme in cui, dopo il primo turno a vuoto, in mano c'è una carta che si può pagare
    # (cambiando il mazzo delle carte cambiano le mani dei semi: non si fissa un seme)
    for seme in range(9, 60):
        g = avvia(seme)
        st = client.post(f"/api/duello/{g['id']}/turno", json={"mosse": []}).json()["stato"]
        carta = min(st["mano"], key=lambda c: c["costo"])
        if carta["costo"] <= st["energia"]:
            break
    assert carta["costo"] <= st["energia"]
    r = client.post(
        f"/api/duello/{g['id']}/turno", json={"mosse": [{"carta": carta["id"], "corsia": 1}]}
    ).json()
    rivela = [e for e in r["eventi"] if e["t"] == "rivela" and e["lato"] == 0]
    assert rivela and rivela[0]["carta_view"]["id"] == carta["id"] and rivela[0]["corsia"] == 1
    assert any(i["carta"]["id"] == carta["id"] for i in r["stato"]["corsie"][1][0])
    assert carta["id"] not in [c["id"] for c in r["stato"]["mano"]]


def test_illegal_moves_are_rejected(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'du3.db'}")
    g = avvia(11)
    st = g["stato"]
    pid = g["id"]
    carta = st["mano"][0]
    for mosse in (
        [{"carta": "nope", "corsia": 0}],
        [{"carta": carta["id"], "corsia": 7}],
        [{"carta": carta["id"], "corsia": 0}, {"carta": carta["id"], "corsia": 1}],
        [{"carta": c["id"], "corsia": 0} for c in st["mano"]],  # troppa energia al turno 1
    ):
        if (
            len(mosse) > 1
            and mosse[0]["carta"] == mosse[-1]["carta"]
            or any(m["carta"] == "nope" or m["corsia"] == 7 for m in mosse)
            or sum(c["costo"] for c in st["mano"]) > 1
        ):
            assert client.post(f"/api/duello/{pid}/turno", json={"mosse": mosse}).status_code == 422
    assert client.get("/api/duello/nonesiste").status_code == 404
    assert client.post("/api/duello/nonesiste/turno", json={"mosse": []}).status_code == 404
    assert pid in PARTITE


def test_prize_for_profile_after_a_game(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'du4.db'}")
    pid = client.post("/api/profile", json={"name": "Anna"}).json()["id"]
    rnd = random.Random(3)
    g = avvia(13, "facile", pid)
    st = g["stato"]
    for _ in range(6):
        out = client.post(
            f"/api/duello/{g['id']}/turno", json={"mosse": mosse_valide(st, rnd)}
        ).json()
        st = out["stato"]
    assert out["premio"] is not None and out["premio"]["xp"] >= 20
    p = client.get(f"/api/profile/{pid}").json()
    assert p["partite"] == 1 and p["xp"] == out["premio"]["xp"] and len(p["collezione"]) == MAZZO
    again = client.get(f"/api/duello/{g['id']}").json()
    assert again["stato"]["finita"]
    # nessun profilo: nessun premio
    g2 = avvia(14, "facile")
    st = g2["stato"]
    for _ in range(6):
        out2 = client.post(f"/api/duello/{g2['id']}/turno", json={"mosse": []}).json()
    assert out2["premio"] is None


def test_senza_carte_giocate_nessun_premio(tmp_path) -> None:  # type: ignore[no-untyped-def]
    """Chiudere una partita a mosse vuote non rende crediti né XP."""
    configure(f"sqlite:///{tmp_path / 'du4b.db'}")
    pid = client.post("/api/profile", json={"name": "Anna"}).json()["id"]
    g = avvia(13, "facile", pid)
    out = finisci(g["id"], g["stato"], vuote=True)
    assert out["finita"] and out["premio"] is None
    assert client.get(f"/api/profile/{pid}").json()["crediti"] == 0


# ---------- rompicapo del giorno ed ELO ----------
def _gioca_tutto(pid: str, rnd: random.Random, stato: dict) -> dict:  # type: ignore[type-arg]
    out: dict = {}  # type: ignore[type-arg]
    for _ in range(6):
        out = client.post(
            f"/api/duello/{pid}/turno", json={"mosse": mosse_valide(stato, rnd)}
        ).json()
        stato = out["stato"]
    return out


def test_daily_puzzle_same_for_everyone_and_one_try_per_name(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'du5.db'}")
    info = client.get("/api/duello/giorno/info").json()
    assert info["mazzo"] == client.get("/api/duello/giorno/info").json()["mazzo"]
    assert (
        len(info["mazzo"]) == MAZZO and len(info["mazzo_cpu"]) == MAZZO and info["classifica"] == []
    )
    g1 = client.post("/api/duello/giorno/start", json={"name": "Anna"}).json()
    g2 = client.post("/api/duello/giorno/start", json={"name": "Bruno"}).json()
    assert [c["id"] for c in g1["stato"]["mano"]] == [c["id"] for c in g2["stato"]["mano"]]
    assert {c["id"] for c in g1["stato"]["mano"]} <= {c["id"] for c in info["mazzo"]}
    rnd = random.Random(1)
    out = _gioca_tutto(g1["id"], rnd, g1["stato"])
    assert out["finita"]
    esito = client.get(f"/api/duello/giorno/{g1['id']}/esito").json()
    assert 0 <= esito["stelle"] <= 3 and esito["posizione"] == 1
    assert client.get(f"/api/duello/giorno/{g2['id']}/esito").status_code == 409
    # un solo tentativo a nome (anche con maiuscole diverse)
    assert client.post("/api/duello/giorno/start", json={"name": "anna"}).status_code == 409
    assert client.post("/api/duello/giorno/start", json={"name": "  "}).status_code == 422
    _gioca_tutto(g2["id"], rnd, g2["stato"])
    board = client.get("/api/duello/giorno/info").json()["classifica"]
    assert {r["nome"] for r in board} == {"Anna", "Bruno"}
    assert board == sorted(board, key=lambda r: (-r["stelle"], -r["punteggio"]))
    assert client.get("/api/duello/giorno/nope/esito").status_code == 404


def test_elo_updates_with_results(tmp_path) -> None:  # type: ignore[no-untyped-def]
    from app.profilo import ELO_CPU, nuovo_elo

    assert nuovo_elo(1200, 1200, 1.0) == 1212 and nuovo_elo(1200, 1200, 0.0) == 1188
    assert nuovo_elo(1200, 1200, 0.5) == 1200
    assert nuovo_elo(1200, ELO_CPU["difficile"], 1.0) > nuovo_elo(1200, ELO_CPU["facile"], 1.0)
    configure(f"sqlite:///{tmp_path / 'du6.db'}")
    pid = client.post("/api/profile", json={"name": "Elena"}).json()["id"]
    assert client.get(f"/api/profile/{pid}").json()["elo"] == 1200
    g = avvia(21, "facile", pid)
    out = _gioca_tutto(g["id"], random.Random(5), g["stato"])
    pr = out["premio"]
    assert pr["elo_prima"] == 1200 and pr["elo_dopo"] != 1200 or out["vinto"] is None
    assert client.get(f"/api/profile/{pid}").json()["elo"] == pr["elo_dopo"]
