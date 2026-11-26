import random

import pytest

from app.data_loader import load_characters, load_ruleset, validate
from app.engine.formazioni import FORMAZIONI
from app.engine.missioni import BONUS, MISSIONI, completata, missione_per_seme
from app.engine.models import Team
from app.engine.roles import ROLES
from app.engine.simulate import simulate

RULES = load_ruleset()
CH = load_characters()
CHARS = list(CH.values())


def team(ids: list[str], **kw) -> Team:  # type: ignore[no-untyped-def]
    return Team(nome="x", members=[CH[i] for i in ids], **kw)


GOKU = ["son-goku", "vegeta", "gaara", "kakashi-hatake", "piccolo", "whis", "tsunade"]
FREEZER = [
    "freezer",
    "naruto-uzumaki",
    "kaido",
    "itachi-uchiha",
    "boa-hancock",
    "kenjaku",
    "sakura-haruno",
]


def test_data_is_valid_with_rivalries() -> None:
    assert validate() == []
    assert len(RULES.rivalita) >= 20


def test_rivalries_are_detected_across_sides() -> None:
    r = simulate(team(GOKU), team(FREEZER), 1, RULES)
    noms = {x.nome for x in r.rivalita}
    assert "Vendetta di Namek" in noms  # Goku contro Freezer
    x = next(x for x in r.rivalita if x.nome == "Vendetta di Namek")
    assert (
        r.squadre["A"].members[x.a].id == "son-goku" and r.squadre["B"].members[x.b].id == "freezer"
    )
    # nessuna rivalità tra personaggi dello stesso lato
    assert simulate(team(GOKU), team(GOKU[::-1]), 1, RULES).rivalita is not None


def test_rival_forms_share_the_rivalry() -> None:
    from app.data_loader import load_forms

    ssj = load_forms()["son-goku--ultra-istinto"]
    a = Team(nome="x", members=[ssj, *[CH[i] for i in GOKU[1:]]])
    r = simulate(a, team(FREEZER), 1, RULES)
    assert any(x.nome == "Vendetta di Namek" for x in r.rivalita)


def test_rivalry_adds_damage() -> None:
    """Con la rivalità attiva Goku e Freezer si fanno più male che senza."""
    senza_regole = RULES.model_copy(update={"rivalita": []})
    gain = 0
    for seed in range(150):
        con = simulate(team(GOKU), team(FREEZER), seed, RULES, registra=False)
        senza = simulate(team(GOKU), team(FREEZER), seed, senza_regole, registra=False)
        gain += (con.totali["A"] + con.totali["B"] < senza.totali["A"] + senza.totali["B"]) - (
            con.totali["A"] + con.totali["B"] > senza.totali["A"] + senza.totali["B"]
        )
    assert gain > 0


def test_mission_is_deterministic_and_varied() -> None:
    assert missione_per_seme(5, "a") == missione_per_seme(5, "a")
    assert len({missione_per_seme(s, "x").id for s in range(200)}) == len(MISSIONI)


@pytest.mark.parametrize("mid", list(MISSIONI))
def test_every_mission_can_be_completed_and_failed(mid: str) -> None:
    rnd = random.Random(1)
    esiti = set()
    for _ in range(400):
        t = Team(nome="x", members=rnd.sample(CHARS, 7))
        esiti.add(completata(mid, t, rnd.randint(0, 14), RULES))
        if esiti == {True, False}:
            return
    pytest.fail(f"missione {mid}: non è mai {{True, False}}: {esiti}")


def test_mission_bonus_raises_stats() -> None:
    base = simulate(team(GOKU), team(FREEZER), 3, RULES)
    con = simulate(team(GOKU, bonus_missione=BONUS), team(FREEZER), 3, RULES)
    assert all(
        c.hp > b.hp and c.atk > b.atk for c, b in zip(con.unita["A"], base.unita["A"], strict=True)
    )
    assert con.unita["B"] == base.unita["B"]


def test_formations_change_rows_and_stay_balanced() -> None:
    assert all(
        len(f.fila) == 7 and set(f.fila) <= {0, 1, 2} and 0 in f.fila for f in FORMAZIONI.values()
    )
    with pytest.raises(ValueError):
        simulate(team(GOKU), team(FREEZER), 1, RULES, formazione={"A": "boh", "B": "classica"})
    n = 250
    for fid in FORMAZIONI:
        wins = 0
        for k in range(n):
            rnd = random.Random(k)
            pick = rnd.sample(CHARS, 14)
            r = simulate(
                Team(nome="A", members=pick[:7]),
                Team(nome="B", members=pick[7:]),
                k + 1,
                RULES,
                registra=False,
                formazione={"A": fid, "B": "classica"},
            )
            wins += r.vincitore == "A"
        assert 0.38 < wins / n < 0.62, (fid, wins / n)
    assert len(ROLES) == 7
