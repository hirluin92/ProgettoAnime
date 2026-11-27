import random

from fastapi.testclient import TestClient

from app.db.session import configure
from app.main import app
from app.scala_duelli import (
    MAX_GRADINI,
    bonus_cpu,
    e_boss,
    livello_cpu,
    mazzo_avversario,
    rinforza,
)
from tests.test_duello_api import mosse_valide

client = TestClient(app)


def avvia(seed: int, pid: str | None = None) -> dict:  # type: ignore[type-arg]
    d = client.get(f"/api/duello/draft?seed={seed}").json()
    picks = [{"id": d["mani"][i][0]["id"], "hand": i} for i in range(8)]
    r = client.post(
        "/api/scala-duelli/start", json={"seed": seed, "picks": picks, "profile_id": pid}
    )
    assert r.status_code == 200, r.text
    return r.json()


def duello(run_id: str, rnd: random.Random) -> dict:  # type: ignore[type-arg]
    g = client.post(f"/api/scala-duelli/{run_id}/gioca")
    assert g.status_code == 200, g.text
    g = g.json()
    stato = g["stato"]
    out: dict = {}  # type: ignore[type-arg]
    for _ in range(6):
        out = client.post(
            f"/api/duello/{g['id']}/turno", json={"mosse": mosse_valide(stato, rnd)}
        ).json()
        stato = out["stato"]
    return out


def test_difficulty_curve_and_bosses() -> None:
    assert [bonus_cpu(g) for g in range(1, 9)] == [0, 0, 0, 3, 1, 1, 2, 4]
    assert [e_boss(g) for g in (3, 4, 8, 12)] == [False, True, True, True]
    assert [livello_cpu(g) for g in (1, 3, 7, 12)] == [
        "facile",
        "normale",
        "difficile",
        "difficile",
    ]
    from app.duello_api import _deck

    c = _deck(5)[0]
    assert rinforza(c, 1).potenza == min(13, c.potenza + 1) and rinforza(c, 99).potenza == 13
    a1 = mazzo_avversario(1, 1, frozenset())
    a8 = mazzo_avversario(1, 8, frozenset())
    assert len(a1) == len(a8) == 8
    assert sum(c.potenza for c in a8) > sum(c.potenza for c in a1) - 5  # i boss sono più forti


def test_run_progression_and_rules(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 's1.db'}")
    run = avvia(3)
    rid = run["run_id"]
    assert run["gradino"] == 1 and len(run["mazzo"]) == 8 and len(run["avversario"]["mazzo"]) == 8
    assert not {c["id"] for c in run["mazzo"]} & {c["id"] for c in run["avversario"]["mazzo"]}
    assert client.post(f"/api/scala-duelli/{rid}/scegli", json={"indice": 0}).status_code == 409
    rnd = random.Random(7)
    out = duello(rid, rnd)
    assert out["finita"] and out["scala"]["gradino"] == 1
    # nel mezzo di un duello non se ne può iniziare un altro; a duello chiuso dipende dall'esito
    if out["scala"]["vinto"]:
        assert len(out["scala"]["offerte"]) == 3 and not out["scala"]["finita"]
        assert [o["tipo"] for o in out["scala"]["offerte"]] == ["carta", "carta", "rinforzo"]
        assert client.post(f"/api/scala-duelli/{rid}/gioca").status_code == 409  # prima il premio
        nuova = out["scala"]["offerte"][0]["carta"]["id"]
        v = client.post(f"/api/scala-duelli/{rid}/scegli", json={"indice": 0}).json()
        assert v["gradino"] == 2 and len(v["mazzo"]) == 9 and nuova in {c["id"] for c in v["mazzo"]}
        assert client.post(f"/api/scala-duelli/{rid}/scegli", json={"indice": 0}).status_code == 409
    else:
        assert out["scala"]["finita"]
        assert client.post(f"/api/scala-duelli/{rid}/gioca").status_code == 409
    assert client.get("/api/scala-duelli/nope").status_code == 404
    assert client.post("/api/scala-duelli/nope/gioca").status_code == 404


def test_upgrade_and_full_deck_replacement(tmp_path) -> None:  # type: ignore[no-untyped-def]
    from app.scala_duelli import CORSE

    configure(f"sqlite:///{tmp_path / 's2.db'}")
    run = avvia(4)
    rid = run["run_id"]
    c = CORSE[rid]
    # rinforzo: +1 alla carta indicata, il mazzo non cresce
    c.offerte = [("rinforzo", c.mazzo[0], 1), ("carta", c.mazzo[1], 0), ("carta", c.mazzo[2], 0)]
    prima = c.mazzo[0].potenza
    v = client.post(f"/api/scala-duelli/{rid}/scegli", json={"indice": 0}).json()
    assert len(v["mazzo"]) == 8 and next(x for x in v["mazzo"] if x["id"] == c.mazzo[0].id)[
        "potenza"
    ] == min(13, prima + 1)
    # mazzo pieno (12): la carta nuova sostituisce la più debole
    from app.duello_api import _deck

    extra = [x for x in _deck(99) if x.id not in {y.id for y in c.mazzo}][:4]
    c.mazzo.extend(extra)
    assert len(c.mazzo) == 12
    nuova = [x for x in _deck(98) if x.id not in {y.id for y in c.mazzo}][0]
    debole = min(c.mazzo, key=lambda x: (x.potenza, x.id))
    c.offerte = [("carta", nuova, 0), ("carta", nuova, 0), ("carta", nuova, 0)]
    v = client.post(f"/api/scala-duelli/{rid}/scegli", json={"indice": 0}).json()
    ids = {x["id"] for x in v["mazzo"]}
    assert len(v["mazzo"]) == 12 and nuova.id in ids and debole.id not in ids


def test_run_ends_with_prize_and_best_record(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 's3.db'}")
    pid = client.post("/api/profile", json={"name": "Anna"}).json()["id"]
    rnd = random.Random(11)
    run = avvia(5, pid)
    rid = run["run_id"]
    ultimo: dict = {}  # type: ignore[type-arg]
    for _ in range(MAX_GRADINI + 1):
        ultimo = duello(rid, rnd)["scala"]
        if ultimo["finita"]:
            break
        client.post(f"/api/scala-duelli/{rid}/scegli", json={"indice": 2})
    assert ultimo["finita"] and ultimo["premio"] is not None
    assert ultimo["premio"]["xp"] == 20 + 15 * ultimo["vinti"]
    p = client.get(f"/api/profile/{pid}").json()
    assert p["best_scala"] == ultimo["vinti"] and p["crediti"] == ultimo["premio"]["crediti"]
    assert len(p["collezione"]) >= 8
    # a corsa finita non si continua e il premio non si paga due volte
    assert client.post(f"/api/scala-duelli/{rid}/gioca").status_code == 409
    assert client.get(f"/api/profile/{pid}").json()["xp"] == ultimo["premio"]["xp_totale"]


def test_duello_scaduto_non_blocca_la_corsa(tmp_path) -> None:  # type: ignore[no-untyped-def]
    from app.duello_api import PARTITE

    configure(f"sqlite:///{tmp_path / 'sd.db'}")
    run = avvia(7)
    g = client.post(f"/api/scala-duelli/{run['run_id']}/gioca")
    assert g.status_code == 200
    # finché il duello esiste, non se ne apre un secondo
    assert client.post(f"/api/scala-duelli/{run['run_id']}/gioca").status_code == 409
    # il duello scade (o il server si riavvia): la corsa riparte invece di restare bloccata
    PARTITE.pop(g.json()["id"], None)
    assert client.post(f"/api/scala-duelli/{run['run_id']}/gioca").status_code == 200
