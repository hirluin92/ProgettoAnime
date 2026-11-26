import random

from fastapi.testclient import TestClient

from app.data_loader import load_characters, load_ruleset, validate
from app.engine.models import Team
from app.engine.rng import Rng
from app.engine.simulate import simulate
from app.main import app

CHARS = list(load_characters().values())
RULES = load_ruleset()


def random_team(rnd: random.Random, name: str) -> Team:
    return Team(nome=name, members=rnd.sample(CHARS, 7))


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


def test_battle_log_is_consistent() -> None:
    rnd = random.Random(2)
    for seed in range(300):
        res = simulate(random_team(rnd, "A"), random_team(rnd, "B"), seed, RULES)
        assert res.versione == 2 and 1 <= res.turni <= 10
        assert res.eventi[0].tipo == "ingresso" and res.eventi[-1].tipo == "fine"
        hp = {s: [u.hp for u in res.unita[s]] for s in ("A", "B")}
        for e in res.eventi:
            if e.tipo != "azione":
                continue
            for x in e.esiti:
                hp[x.lato][x.idx] += x.delta
            # i danni e le cure ricostruiscono esattamente la fotografia del campo
            assert hp == e.stato.hp
            for s in ("A", "B"):
                assert all(0 <= h <= res.unita[s][i].hp for i, h in enumerate(hp[s]))
        fine = res.eventi[-1]
        assert fine.vincitore == res.vincitore
        assert all(0 <= res.totali[s] <= 100 for s in ("A", "B"))
        if fine.motivo == "ko":
            perdente = "B" if res.vincitore == "A" else "A"
            assert res.totali[perdente] == 0 and res.totali[res.vincitore] > 0


def test_roles_matter() -> None:
    """Gli stessi sette personaggi vincono più spesso nei ruoli giusti che in quelli sbagliati."""
    from app.engine.roles import ROLES
    from app.engine.scoring import potenza_ruolo

    rnd = random.Random(5)
    punti_ok = punti_ko = 0
    for k in range(60):
        pick = rnd.sample(CHARS, 14)
        mine, theirs = pick[:7], pick[7:]
        libero = list(mine)
        giusti = {}
        for i in sorted(range(7), reverse=True):
            c = max(libero, key=lambda c: potenza_ruolo(c, ROLES[i]))
            giusti[i] = c
            libero.remove(c)
        ok = Team(nome="ok", members=[giusti[i] for i in range(7)])
        no = Team(nome="no", members=list(reversed(ok.members)))
        op = Team(nome="op", members=theirs)
        for seed in range(6):
            punti_ok += simulate(ok, op, seed + 10 * k, RULES, registra=False).vincitore == "A"
            punti_ko += simulate(no, op, seed + 10 * k, RULES, registra=False).vincitore == "A"
    assert punti_ok > punti_ko


def test_synergies_and_bonds_appear() -> None:
    ids = ["naruto-uzumaki", "sasuke-uchiha", "kakashi-hatake"]
    by_id = load_characters()
    rest = [c for c in CHARS if c.id not in ids and c.anime != "naruto"][:4]
    team = Team(nome="7", members=[by_id[i] for i in ids] + rest)
    res = simulate(team, random_team(random.Random(3), "B"), 1, RULES)
    nomi = {x.nome for x in res.sinergie if x.lato == "A"}
    assert "Squadra 7" in nomi and "Universo Naruto" in nomi


def test_balance_bounds() -> None:
    rnd = random.Random(11)
    turni, ko, a = [], 0, 0
    n = 400
    for k in range(n):
        pick = rnd.sample(CHARS, 14)
        r = simulate(
            Team(nome="A", members=pick[:7]),
            Team(nome="B", members=pick[7:]),
            k,
            RULES,
            registra=False,
        )
        turni.append(r.turni)
        ko += 0 in r.totali.values()
        a += r.vincitore == "A"
    assert 4 <= sum(turni) / n <= 8  # scontro leggibile in 20-30 secondi
    assert ko / n > 0.8  # quasi sempre finisce per K.O., non ai punti
    assert 0.42 <= a / n <= 0.58  # nessun vantaggio strutturale per il lato A


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
