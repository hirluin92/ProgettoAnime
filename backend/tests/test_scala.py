import statistics

from fastapi.testclient import TestClient

from app.data_loader import load_characters, load_ruleset
from app.db.session import configure
from app.engine.models import Team
from app.engine.simulate import simulate
from app.main import app
from app.scala import MAX_GRADINI, POTENZIAMENTI, RUNS, cpu_team, forza, offerte_per
from tests.test_quick import cheapest_picks

client = TestClient(app)
PIANO = {
    "tattiche": ["assalto", "tecnica", "guardia"],
    "carica": "subito",
    "formazione": "classica",
}


def start(seed: int = 9, profile_id: str | None = None) -> dict:  # type: ignore[type-arg]
    body = cheapest_picks(seed)
    r = client.post(
        "/api/scala/start",
        json={"seed": seed, "picks": body["picks"], "swap": None, "profile_id": profile_id},
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_team_bonuses_are_applied_by_the_engine() -> None:
    chars = list(load_characters().values())
    base = Team(nome="A", members=chars[:7])
    b = Team(nome="B", members=chars[7:14])
    rules = load_ruleset()
    r0 = simulate(base, b, 1, rules)
    r1 = simulate(
        Team(nome="A", members=chars[:7], bonus_atk=0.1, bonus_hp=0.1, bonus_dif=0.2,
             energia_iniziale=30, scudo_iniziale=0.2),
        b, 1, rules,
    )  # fmt: skip
    for x, y in zip(r1.unita["A"], r0.unita["A"], strict=True):
        assert x.atk > y.atk and x.hp > y.hp and x.dif > y.dif
    ing = r1.eventi[0]
    assert any(s > 0 for s in ing.stato.scudo["A"]) and all(s == 0 for s in ing.stato.scudo["B"])  # type: ignore[union-attr]
    boss = simulate(Team(nome="A", members=chars[:7], boss_hp=3.0, boss_atk=1.5), b, 1, rules)
    assert (
        boss.unita["A"][0].hp > 2.9 * r0.unita["A"][0].hp and boss.unita["A"][1] == r0.unita["A"][1]
    )


def test_opponents_get_stronger_step_by_step() -> None:
    medie = [
        statistics.mean(forza(cpu_team(s, g)) for s in range(1, 40)) for g in (1, 4, 8, 12, 16)
    ]
    assert medie == sorted(medie) and medie[-1] > medie[0] * 1.15
    assert cpu_team(3, 5) == cpu_team(3, 5)


def test_offers_are_three_distinct_and_deterministic() -> None:
    for seed in range(30):
        o = offerte_per(seed, 2)
        assert len(set(o)) == 3 and set(o) <= set(POTENZIAMENTI) and o == offerte_per(seed, 2)


def test_full_run_flow(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'sc1.db'}")
    s = start()
    assert s["gradino"] == 1 and s["max_gradini"] == MAX_GRADINI and len(s["squadra"]) == 7
    assert s["avversario"]["forza"] > 0 and len(s["avversario"]["membri"]) == 7
    rid = s["run_id"]
    assert client.get(f"/api/scala/{rid}").json()["run_id"] == rid
    upgrade = None
    for _ in range(MAX_GRADINI + 1):
        r = client.post(f"/api/scala/{rid}/fight", json={"piano": PIANO, "upgrade": upgrade})
        assert r.status_code == 200, r.text
        j = r.json()
        assert client.get(f"/api/matches/{j['match_id']}").status_code == 200
        if j["finita"]:
            assert j["offerte"] == [] and j["prossimo"] is None
            assert j["gradini_vinti"] == j["gradino"] - 1 + int(j["vinto"])
            break
        assert (
            j["vinto"] and len(j["offerte"]) == 3 and j["prossimo"]["gradino"] == j["gradino"] + 1
        )
        # prima di scegliere il potenziamento non si può continuare
        assert client.post(f"/api/scala/{rid}/fight", json={"piano": PIANO}).status_code == 422
        assert (
            client.post(f"/api/scala/{rid}/fight", json={"piano": PIANO, "upgrade": 7}).status_code
            == 422
        )
        upgrade = 1
    else:
        raise AssertionError("la corsa non è mai finita")
    assert client.post(f"/api/scala/{rid}/fight", json={"piano": PIANO}).status_code == 409


def test_chosen_upgrades_are_applied_to_the_team(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'sc2.db'}")
    for seed in range(1, 60):
        s = start(seed)
        rid = s["run_id"]
        r = client.post(f"/api/scala/{rid}/fight", json={"piano": PIANO}).json()
        if r["finita"]:
            continue
        scelto = r["offerte"][2]["id"]
        r2 = client.post(f"/api/scala/{rid}/fight", json={"piano": PIANO, "upgrade": 2}).json()
        assert RUNS[rid].presi == [scelto]
        assert r2["gradino"] == 2
        return
    raise AssertionError("nessuna corsa ha vinto il primo gradino")


def test_validation_and_unknown_run(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'sc3.db'}")
    assert client.get("/api/scala/nonesiste").status_code == 404
    assert client.post("/api/scala/nonesiste/fight", json={"piano": PIANO}).status_code == 404
    bad = cheapest_picks(9)["picks"]
    bad[0]["id"] = "nope"
    assert client.post("/api/scala/start", json={"seed": 9, "picks": bad}).status_code == 422
    rid = start()["run_id"]
    assert (
        client.post(
            f"/api/scala/{rid}/fight", json={"piano": {**PIANO, "tattiche": ["boh"] * 3}}
        ).status_code
        == 422
    )
    assert (
        client.post(
            f"/api/scala/{rid}/fight", json={"piano": {**PIANO, "formazione": "boh"}}
        ).status_code
        == 422
    )


def test_run_end_awards_xp_season_and_record(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'sc4.db'}")
    pid = client.post("/api/profile", json={"name": "Anna"}).json()["id"]
    rid = start(9, pid)["run_id"]
    upgrade = None
    for _ in range(MAX_GRADINI + 1):
        j = client.post(f"/api/scala/{rid}/fight", json={"piano": PIANO, "upgrade": upgrade}).json()
        if j["finita"]:
            break
        upgrade = 0
    prem = j["premio"]
    assert prem is not None and prem["xp"] == 20 + 15 * j["gradini_vinti"]
    p = client.get(f"/api/profile/{pid}").json()
    assert p["best_scala"] == j["gradini_vinti"] and p["xp"] == prem["xp"]
    assert p["stagione"]["punti"] == max(1, j["gradini_vinti"] * 2)
    # nessun profilo, nessun premio
    rid2 = start(9)["run_id"]
    for _ in range(MAX_GRADINI + 1):
        j2 = client.post(f"/api/scala/{rid2}/fight", json={"piano": PIANO, "upgrade": 0}).json()
        if j2["finita"]:
            break
        upgrade = 0
    assert j2["premio"] is None
