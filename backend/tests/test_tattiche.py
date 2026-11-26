import pytest

from app.data_loader import load_characters, load_ruleset
from app.engine import tattiche as tat
from app.engine.models import Fase, Team
from app.engine.roles import ROLES
from app.engine.simulate import simulate


def team(ids: list[str], nome: str) -> Team:
    chars = load_characters()
    return Team(nome=nome, members=[chars[i] for i in ids])


A = team(["son-goku", "vegeta", "gaara", "kakashi-hatake", "piccolo", "whis", "tsunade"], "A")
B = team(
    [
        "naruto-uzumaki",
        "sasuke-uchiha",
        "kaido",
        "itachi-uchiha",
        "boa-hancock",
        "kenjaku",
        "sakura-haruno",
    ],
    "B",
)


def test_rock_paper_scissors() -> None:
    assert tat.esito("assalto", "tecnica") == "A"
    assert tat.esito("tecnica", "guardia") == "A"
    assert tat.esito("guardia", "assalto") == "A"
    assert tat.esito("tecnica", "assalto") == "B"
    assert tat.esito("assalto", "assalto") == "pari"
    assert tat.moltiplicatore("A", "assalto", "tecnica") == tat.BONUS_VITTORIA
    assert tat.moltiplicatore("B", "assalto", "tecnica") == tat.MALUS_SCONFITTA
    assert tat.moltiplicatore("A", "guardia", "guardia") == 1.0


def test_phases_cover_all_turns() -> None:
    assert [tat.fase_di_turno(n) for n in range(1, 11)] == [0, 0, 0, 1, 1, 1, 2, 2, 2, 2]


def test_cpu_tactics_are_deterministic_and_valid() -> None:
    for seed in range(200):
        for pl in (["assalto"] * 3, ["tecnica", "guardia", "assalto"]):
            a = tat.cpu_tattiche(seed, pl)
            assert a == tat.cpu_tattiche(seed, pl) and tat.valida(a)


def test_cpu_reads_the_player_pattern() -> None:
    """Contro chi ripete sempre la stessa tattica la CPU la contrasta più spesso del caso (33%)."""
    contrasto = {v: k for k, v in tat.BATTE.items()}
    n = hit = 0
    for seed in range(600):
        cpu = tat.cpu_tattiche(seed, ["assalto"] * 3)
        for f in (1, 2):
            n += 1
            hit += cpu[f] == contrasto["assalto"]
    assert hit / n > 0.4


def test_tactics_change_the_fight_and_emit_phase_events() -> None:
    rules = load_ruleset()
    neutro = simulate(A, B, 5, rules)
    con = simulate(A, B, 5, rules, tattiche={"A": ["assalto"] * 3, "B": ["tecnica"] * 3})
    fasi = [e for e in con.eventi if isinstance(e, Fase)]
    assert [f.turno for f in fasi] == [1, 4, 7][: len(fasi)] and fasi[0].esito == "A"
    assert con.tattiche["A"] == ["assalto"] * 3 and neutro.tattiche == {}
    # A vince il confronto in ogni fase: infligge più danno che nella partita neutra
    assert con.totali["A"] - con.totali["B"] >= neutro.totali["A"] - neutro.totali["B"]


def test_same_seed_same_result() -> None:
    rules = load_ruleset()
    t = {"A": ["assalto", "guardia", "tecnica"], "B": ["tecnica", "tecnica", "assalto"]}
    assert simulate(A, B, 9, rules, tattiche=t) == simulate(A, B, 9, rules, tattiche=t)


def test_invalid_tactics_rejected() -> None:
    rules = load_ruleset()
    with pytest.raises(ValueError):
        simulate(A, B, 1, rules, tattiche={"A": ["boh"] * 3, "B": ["assalto"] * 3})
    assert len(ROLES) == 7


def test_tactics_do_not_unbalance_sides() -> None:
    """Con tattiche casuali per entrambi i lati nessun lato vince sistematicamente."""
    import random

    rules = load_ruleset()
    rnd = random.Random(3)
    chars = list(load_characters().values())
    wins = 0
    n = 300
    for k in range(n):
        pick = rnd.sample(chars, 14)
        ta, tb = Team(nome="A", members=pick[:7]), Team(nome="B", members=pick[7:])
        t = {
            "A": [rnd.choice(tat.TATTICHE) for _ in range(3)],
            "B": [rnd.choice(tat.TATTICHE) for _ in range(3)],
        }
        wins += simulate(ta, tb, k + 1, rules, registra=False, tattiche=t).vincitore == "A"
    assert 0.42 < wins / n < 0.58
