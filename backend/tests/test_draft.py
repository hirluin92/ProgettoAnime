import random

from app.data_loader import load_characters, load_forms
from app.draft import (
    BUDGET,
    CHEAP,
    HAND,
    MAX_HANDS,
    MYSTERY_CAP,
    REROLLS,
    ROUNDS,
    allowed,
    build_deck,
    forms_by_base,
    hand,
    mystery_cost,
    mystery_round,
)

CHARS = list(load_characters().values())
FORMS = forms_by_base(load_forms())


def deck(seed: int):  # type: ignore[no-untyped-def]
    return build_deck(seed, CHARS, FORMS)


def test_deck_is_deterministic_and_one_card_per_character() -> None:
    a, b = deck(5), deck(5)
    assert [c.id for c in a] == [c.id for c in b] and a != deck(6)
    assert len(a) == len(CHARS)
    assert len({c.base_id or c.id for c in a}) == len(CHARS)  # niente doppioni tra base e forma


def test_forms_appear_sometimes() -> None:
    n = sum(1 for s in range(200) for c in deck(s) if c.forma)
    assert 0 < n / 200 < 15  # in media qualche forma per mazzo, non troppe


def test_every_hand_has_a_cheap_card_for_thousands_of_seeds() -> None:
    for seed in range(1, 3001):
        d = deck(seed)
        for h in range(MAX_HANDS):
            cards = hand(d, h)
            assert len(cards) == HAND and any(c.costo <= CHEAP for c in cards), (seed, h)


def test_mystery_card_is_always_cheap_and_early() -> None:
    for seed in range(1, 500):
        assert 2 <= mystery_round(seed) <= 5
        assert all(1 <= mystery_cost(c) <= MYSTERY_CAP for c in CHARS)


def test_never_stuck_even_playing_the_most_expensive_allowed_card() -> None:
    """Il caso peggiore: a ogni giro si prende la carta più cara consentita, con i rilanci usati."""
    for seed in range(1, 400):
        d = deck(seed)
        mist = mystery_round(seed)
        rnd = random.Random(seed)
        spent, h = 0, 0
        rerolls_left = REROLLS
        for r in range(ROUNDS):
            left_after = ROUNDS - r - 1
            if r == mist:
                cost = mystery_cost(hand(d, h)[0])
                assert allowed(spent, cost, left_after), (seed, r)
            else:
                if rerolls_left and rnd.random() < 0.3:
                    h += 1
                    rerolls_left -= 1
                ok = [c for c in hand(d, h) if allowed(spent, c.costo, left_after)]
                assert ok, f"bloccato: seme {seed}, giro {r}"
                cost = max(c.costo for c in ok)
            spent += cost
            h += 1
        assert spent <= BUDGET


def test_budget_fits_an_average_team() -> None:
    mean = sum(c.costo for c in CHARS) / len(CHARS)
    assert 6.5 <= mean <= 8.5 and BUDGET >= round(mean * ROUNDS) - 2
