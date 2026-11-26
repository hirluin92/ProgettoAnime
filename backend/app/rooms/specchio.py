"""Draft a specchio (2 giocatori): stesse 5 carte per entrambi, si sceglie a turno.

A ogni giro si mostra una mano da 5 carte dal mazzo del seme. Chi ha la mano sceglie una carta e il
suo slot; poi sceglie l'altro tra le carte rimaste. Le altre 3 carte spariscono. Chi comincia
si alterna a ogni giro. Niente budget: la scarsità è la concorrenza. Se il tempo scade, la
carta e lo slot migliori (per potenza) vengono scelti in automatico.
"""

from app.draft import ROUNDS, build_deck, forms_by_base, hand
from app.engine import affinita
from app.engine.models import Character
from app.engine.roles import ROLES
from app.engine.scoring import potenza_ruolo
from app.rooms.models import Player, SpecchioCard, SpecchioView
from app.rooms.protocol import ServerMessage

PICKS_PER_ROUND = 2


class SpecchioError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class Specchio:
    def __init__(
        self,
        players: list[Player],
        seed: int,
        chars: list[Character],
        forms: dict[str, Character],
        pick_timeout: int,
        now: float,
    ) -> None:
        if len(players) != 2:
            raise SpecchioError("two_players", "Il draft a specchio è per 2 giocatori")
        self.players = players
        self.pick_timeout = pick_timeout
        self.deck = build_deck(seed, chars, forms_by_base(forms))
        self.round = 0
        self.picks_in_round = 0
        self.taken: dict[str, str] = {}  # id carta -> id giocatore
        self.deadline = now + pick_timeout
        self.finished = False

    # ---- stato ----
    def first(self) -> Player:
        return self.players[self.round % 2]

    def second(self) -> Player:
        return self.players[(self.round + 1) % 2]

    def turn(self) -> Player | None:
        if self.finished:
            return None
        return self.first() if self.picks_in_round == 0 else self.second()

    def cards(self) -> list[Character]:
        return hand(self.deck, self.round)

    def view(self) -> SpecchioView:
        t = self.turn()
        cards = [] if self.finished else self.cards()
        return SpecchioView(
            round=min(self.round, ROUNDS - 1),
            rounds=ROUNDS,
            turn_player_id=t.id if t else None,
            first_player_id=self.first().id,
            deadline=self.deadline,
            hand=[
                SpecchioCard(character=c, affinita=affinita.tutte(c), taken_by=self.taken.get(c.id))
                for c in cards
            ],
        )

    # ---- azioni ----
    def pick(
        self, pid: str, character_id: str, role: str, now: float, *, auto: bool = False
    ) -> list[ServerMessage]:
        turn = self.turn()
        if turn is None or turn.id != pid:
            raise SpecchioError("not_your_turn", "Non è il tuo turno")
        card = next((c for c in self.cards() if c.id == character_id), None)
        if card is None or card.id in self.taken:
            raise SpecchioError("bad_card", "Carta non disponibile")
        if role not in ROLES or turn.slots[role] is not None:
            raise SpecchioError("bad_role", "Slot non libero")
        turn.slots[role] = card
        self.taken[card.id] = pid
        self.picks_in_round += 1
        if self.picks_in_round == PICKS_PER_ROUND:
            self.round += 1
            self.picks_in_round = 0
            if self.round >= ROUNDS:
                self.finished = True
        self.deadline = now + self.pick_timeout
        del auto
        return []

    def best_choice(self, p: Player) -> tuple[str, str]:
        """La mossa che un giocatore sensato farebbe: la coppia carta-slot con più potenza."""
        free = [r for r in ROLES if p.slots[r] is None]
        best = max(
            ((c, r) for c in self.cards() if c.id not in self.taken for r in free),
            key=lambda t: (potenza_ruolo(t[0], t[1]), -ROLES.index(t[1]), t[0].id),
        )
        return best[0].id, best[1]

    def tick(self, now: float) -> list[ServerMessage]:
        """Se il tempo è scaduto sceglie al posto di chi è di turno."""
        t = self.turn()
        if t is None or now < self.deadline:
            return []
        cid, role = self.best_choice(t)
        self.pick(t.id, cid, role, now, auto=True)
        return []
