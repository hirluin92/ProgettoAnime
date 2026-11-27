from fastapi.testclient import TestClient

from app.data_loader import load_characters
from app.db.session import configure
from app.draft import BUDGET, MAX_HANDS, REROLLS, ROUNDS, hand, mystery_cost, mystery_round
from app.engine.roles import ROLES
from app.main import app
from app.quick import cost_of, cpu_draft, deck_for

client = TestClient(app)


def a_id(seed: int) -> str:
    return client.get(f"/api/quick/draft?seed={seed}").json()["arena"]["id"]


def cheapest_picks(seed: int, rerolls: int = 0, swap: list[str] | None = None) -> dict:  # type: ignore[type-arg]
    """Un draft valido: carta più economica di ogni mano, ruoli in ordine."""
    deck = list(deck_for(seed))
    mist = mystery_round(seed)
    picks, h, used = [], 0, rerolls
    for r in range(ROUNDS):
        if used and r not in (mist,) and r > 0:
            h += 1
            used -= 1
        cards = hand(deck, h)
        card = cards[0] if r == mist else min(cards, key=lambda c: (cost_of(c), c.id))
        picks.append({"id": card.id, "role": ROLES[r], "hand": h})
        h += 1
    return {
        "seed": seed,
        "picks": picks,
        "swap": swap,
        "tattiche": ["assalto", "tecnica", "guardia"],
        "carica": "carica",
        "formazione": "classica",
    }


def test_draft_endpoint_is_deterministic_and_complete() -> None:
    a = client.get("/api/quick/draft?seed=5").json()
    assert a == client.get("/api/quick/draft?seed=5").json()
    assert len(a["hands"]) == MAX_HANDS and a["rerolls"] == REROLLS and a["budget"] == BUDGET
    assert all(len(h["cards"]) == 5 for h in a["hands"])
    card = a["hands"][0]["cards"][0]
    assert a["arena"]["id"] and a["arena"]["nome"] and a["arena"]["descrizione"]
    assert a["missione"]["id"] and a["missione"]["descrizione"]
    assert set(card["affinita"]) == set(ROLES) and card["cost"] == card["character"]["costo"]


def test_cost_scale() -> None:
    costi = [cost_of(c) for c in load_characters().values()]
    assert min(costi) == 1 and max(costi) <= 14 and 6 <= sum(costi) / len(costi) <= 9


def test_cpu_respects_budget_and_uniqueness_for_many_seeds() -> None:
    for seed in range(400):
        picks, spent = cpu_draft(seed)
        assert len(picks) == 7 and len({p.id for p in picks}) == 7
        assert spent <= BUDGET


def test_play_flow_and_swap(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'q.db'}")
    body = cheapest_picks(9, rerolls=1)
    r = client.post("/api/quick/play", json=body)
    assert r.status_code == 200, r.text
    res = r.json()
    assert res["result"]["arena"] == a_id(9) and res["result"]["carica"]["A"] == "carica"
    assert res["missione"]["id"] == client.get("/api/quick/draft?seed=9").json()["missione"]["id"]
    assert res["result"]["formazione"]["A"] == "classica" and res["result"]["formazione"]["B"]
    assert isinstance(res["missione"]["riuscita"], bool)
    assert res["spent"] <= BUDGET and client.get(f"/api/matches/{res['id']}").status_code == 200
    first = res["result"]["squadre"]["A"]["members"]
    swapped = client.post("/api/quick/play", json={**body, "swap": ["Capitano", "Guaritore"]})
    assert swapped.status_code == 200
    s = swapped.json()["result"]["squadre"]["A"]["members"]
    assert s[0]["id"] == first[6]["id"] and s[6]["id"] == first[0]["id"]


def test_piano_di_battaglia_spegnibile(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'q3.db'}")
    body = cheapest_picks(9)
    senza = {**body, "tattiche": [], "senza_tattiche": True}
    r = client.post("/api/quick/play", json=senza)
    assert r.status_code == 200, r.text
    assert r.json()["result"]["tattiche"] == {}  # nessuna tattica, nemmeno per la CPU
    # acceso, un piano incompleto resta un errore
    assert client.post("/api/quick/play", json={**body, "tattiche": []}).status_code == 422


def test_validation_rejects_cheating(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'q2.db'}")
    seed = 9
    ok = cheapest_picks(seed)

    def post(body: dict) -> int:  # type: ignore[type-arg]
        return client.post("/api/quick/play", json=body).status_code

    assert post(ok) == 200
    dup_role = {**ok, "picks": [{**p, "role": "Capitano"} for p in ok["picks"]]}
    assert post(dup_role) == 422
    wrong_hand = {**ok, "picks": [{**ok["picks"][0], "hand": 8}, *ok["picks"][1:]]}
    assert post(wrong_hand) == 422
    nope = {**ok, "picks": [{**ok["picks"][0], "id": "nope"}, *ok["picks"][1:]]}
    assert post(nope) == 422
    assert post(cheapest_picks(seed, rerolls=REROLLS + 1)) == 422  # troppi rilanci
    assert post({**ok, "swap": ["Capitano", "Capitano"]}) == 422
    # la carta misteriosa non si può rilanciare e deve corrispondere
    mist = mystery_round(seed)
    wrong_mystery = [dict(p) for p in ok["picks"]]
    other = next(
        c
        for c in hand(list(deck_for(seed)), wrong_mystery[mist]["hand"])
        if c.id != wrong_mystery[mist]["id"]
    )
    wrong_mystery[mist]["id"] = other.id
    assert post({**ok, "picks": wrong_mystery}) == 422


def test_over_budget_is_rejected(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'q3.db'}")
    for seed in range(1, 300):
        deck = list(deck_for(seed))
        mist = mystery_round(seed)
        picks = []
        for r in range(ROUNDS):
            cards = hand(deck, r)
            card = cards[0] if r == mist else max(cards, key=lambda c: c.costo)
            picks.append({"id": card.id, "role": ROLES[r], "hand": r})
        spent = sum(
            mystery_cost(hand(deck, p["hand"])[0])
            if i == mist
            else next(c.costo for c in hand(deck, p["hand"]) if c.id == p["id"])
            for i, p in enumerate(picks)
        )
        if spent > BUDGET:
            r = client.post(
                "/api/quick/play", json={"seed": seed, "picks": picks, "tattiche": ["assalto"] * 3}
            )
            assert r.status_code == 422 and "budget" in r.text
            return
    raise AssertionError("nessun caso sopra budget trovato")


def test_invalid_formation_is_rejected(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'q4.db'}")
    r = client.post("/api/quick/play", json={**cheapest_picks(9), "formazione": "boh"})
    assert r.status_code == 422


def test_mission_bonus_is_applied_when_completed(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'q5.db'}")
    visto: set[bool] = set()
    for seed in range(1, 80):
        r = client.post("/api/quick/play", json=cheapest_picks(seed)).json()
        bonus = r["result"]["squadre"]["A"]["bonus_missione"]
        assert (bonus > 0) == r["missione"]["riuscita"]
        visto.add(r["missione"]["riuscita"])
        if visto == {True, False}:
            return
    raise AssertionError("missione sempre uguale")
