"""Draft V3: mazzo deterministico, mani da 5 carte senza ruolo, rilanci, carta misteriosa.

Funzioni pure (i dati arrivano dal chiamante). Tutto deriva dal seme: stesso seme, stesso mazzo,
quindi la sfida del giorno è uguale per tutti e il server può ricalcolare e validare ogni scelta.

Il mazzo è mescolato; la mano `h` è `mazzo[5h : 5h+5]`. Ogni giro consuma una mano e ogni rilancio
ne consuma un'altra, quindi alla fine servono al massimo ROUNDS + REROLLS mani.
Garanzia anti-blocco: ogni mano contiene almeno una carta da CHEAP punti o meno. Il client ammette
una carta solo se `spesi + costo + CHEAP × giri_rimasti <= budget`: così si può sempre finire.
"""

import random

from app.engine.models import Character

BUDGET = 56
ROUNDS = 7
HAND = 5
REROLLS = 2
MAX_HANDS = ROUNDS + REROLLS
CHEAP = 6
MYSTERY_CAP = 3
MYSTERY_FACTOR = 0.4
FORM_PROB = 0.3
MYSTERY_ROUNDS = (2, 5)  # il giro della carta misteriosa è tra questi (inclusi, base 0)


def mystery_round(seed: int) -> int:
    return random.Random(f"mistero:{seed}").randint(*MYSTERY_ROUNDS)


def mystery_cost(c: Character) -> int:
    return min(MYSTERY_CAP, max(1, round(c.costo * MYSTERY_FACTOR)))


def build_deck(
    seed: int, chars: list[Character], forms: dict[str, list[Character]]
) -> list[Character]:
    """Un esemplare per personaggio (a volte in una delle sue forme), mescolato dal seme."""
    rnd = random.Random(f"mazzo:{seed}")
    deck = [
        rnd.choice(forms[c.id]) if c.id in forms and rnd.random() < FORM_PROB else c for c in chars
    ]
    rnd.shuffle(deck)
    # ogni mano deve avere una carta economica: se manca, la si prende dalla coda del mazzo
    tail = MAX_HANDS * HAND
    for h in range(MAX_HANDS):
        lo = h * HAND
        if any(c.costo <= CHEAP for c in deck[lo : lo + HAND]):
            continue
        while tail < len(deck) and deck[tail].costo > CHEAP:
            tail += 1
        if tail >= len(deck):
            raise ValueError(f"mazzo senza carte economiche sufficienti (seme {seed})")
        deck[lo + HAND - 1], deck[tail] = deck[tail], deck[lo + HAND - 1]
        tail += 1
    return deck


def hand(deck: list[Character], h: int) -> list[Character]:
    return deck[h * HAND : (h + 1) * HAND]


def forms_by_base(forms: dict[str, Character]) -> dict[str, list[Character]]:
    out: dict[str, list[Character]] = {}
    for f in forms.values():
        if f.base_id:
            out.setdefault(f.base_id, []).append(f)
    return out


def allowed(spent: int, cost: int, rounds_left_after: int) -> bool:
    """Regola anti-blocco: dopo questa carta deve restare il minimo per finire la squadra."""
    return spent + cost + CHEAP * rounds_left_after <= BUDGET
