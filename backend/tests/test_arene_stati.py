import random

import pytest

from app.data_loader import load_characters, load_ruleset
from app.engine.arene import ARENE, arena_per_seme
from app.engine.models import Azione, Effetti, Respiro, Team
from app.engine.simulate import simulate

RULES = load_ruleset()
CHARS = list(load_characters().values())


def random_match(k: int, **kw):  # type: ignore[no-untyped-def]
    rnd = random.Random(k)
    pick = rnd.sample(CHARS, 14)
    return simulate(
        Team(nome="A", members=pick[:7]), Team(nome="B", members=pick[7:]), k + 1, RULES, **kw
    )


def test_arena_is_chosen_by_seed() -> None:
    assert arena_per_seme(5) == arena_per_seme(5)
    assert len({arena_per_seme(s).id for s in range(200)}) == len(ARENE)


def test_unknown_arena_or_carica_rejected() -> None:
    with pytest.raises(ValueError):
        random_match(1, arena="vulcanello")
    with pytest.raises(ValueError):
        random_match(1, carica={"A": "boh", "B": "subito"})


@pytest.mark.parametrize("arena", list(ARENE))
def test_each_arena_is_balanced_between_sides(arena: str) -> None:
    wins = turns = 0
    n = 250
    for k in range(n):
        r = random_match(k, arena=arena)
        wins += r.vincitore == "A"
        turns += r.turni
    assert 0.40 < wins / n < 0.60, (arena, wins / n)
    assert 3.5 < turns / n < 9.5, (arena, turns / n)


def test_arena_effects_on_stats() -> None:
    base = random_match(3)
    ghiaccio = random_match(3, arena="ghiaccio")
    assert all(g.vel < b.vel for g, b in zip(ghiaccio.unita["A"], base.unita["A"], strict=True))
    gravita = random_match(3, arena="gravita")
    tank = next(i for i, m in enumerate(gravita.squadre["A"].members) if m.arch == "TAN")
    assert gravita.unita["A"][tank].dif > base.unita["A"][tank].dif


def test_torneo_gives_more_special_moves() -> None:
    def specials(arena: str | None) -> int:
        return sum(
            1
            for k in range(60)
            for e in random_match(k, arena=arena).eventi
            if isinstance(e, Azione) and e.speciale
        )

    assert specials("torneo") > specials(None) * 1.2


def test_status_effects_appear_and_ticks_are_recorded() -> None:
    kinds: set[str] = set()
    ticks = 0
    for k in range(200):
        for e in random_match(k).eventi:
            if isinstance(e, Effetti):
                ticks += 1
                assert all(x.delta < 0 and x.effetto for x in e.esiti)
            if isinstance(e, Azione):
                kinds.update(x.effetto for x in e.esiti if x.effetto)
    assert ticks > 0 and {"bruciatura", "veleno"} <= kinds


def test_vulcano_burns_front_row() -> None:
    r = random_match(7, arena="vulcano")
    assert any(
        isinstance(e, Effetti) and any(x.effetto == "bruciatura" for x in e.esiti) for e in r.eventi
    )


def test_held_ultimate_waits_until_turn_4() -> None:
    for k in range(60):
        r = random_match(k, carica={"A": "carica", "B": "subito"})
        for e in r.eventi:
            if isinstance(e, Azione) and e.speciale and e.da == "A":
                assert e.turno >= 4


def test_combo_last_breath_and_hype() -> None:
    combo = respiro = 0
    for k in range(300):
        r = random_match(k)
        hype_prev = {"A": 0, "B": 0}
        for e in r.eventi:
            if isinstance(e, Azione) and e.effetto == "combo":
                combo += 1
            if isinstance(e, Respiro):
                respiro += 1
                vivi = [i for i, h in enumerate(e.stato.hp[e.lato]) if h > 0]
                assert vivi == [e.idx]
            if isinstance(e, Azione | Effetti | Respiro):
                for s in ("A", "B"):
                    assert hype_prev[s] <= e.stato.hype[s] <= 100  # il pubblico non si raffredda
                hype_prev = dict(e.stato.hype)
    assert combo > 0 and respiro > 0


def test_same_seed_same_result_with_everything() -> None:
    kw = {
        "arena": "nebbia",
        "carica": {"A": "carica", "B": "subito"},
        "tattiche": {"A": ["assalto"] * 3, "B": ["guardia"] * 3},
    }
    assert random_match(4, **kw) == random_match(4, **kw)
