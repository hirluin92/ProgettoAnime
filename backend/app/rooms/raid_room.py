"""Draft cooperativo del raid: 2-4 giocatori costruiscono UNA squadra comune a turno.

A ogni giro una mano da 5 carte (dal mazzo del seme); chi è di turno sceglie una carta e lo slot
nella squadra condivisa. I giocatori si alternano. Niente budget. Se il tempo scade, scelta
automatica della coppia carta-slot con più potenza.
"""

from app.draft import ROUNDS, build_deck, forms_by_base, hand
from app.engine import affinita
from app.engine.models import Character
from app.engine.roles import ROLES
from app.engine.scoring import potenza_ruolo
from app.rooms.models import Player, SpecchioCard, SpecchioView
from app.rooms.protocol import ServerMessage
from app.rooms.specchio import SpecchioError


class Raid:
    picks_in_round = 0  # compatibilità con il ciclo della stanza (una sola scelta a giro)

    def __init__(
        self,
        players: list[Player],
        seed: int,
        chars: list[Character],
        forms: dict[str, Character],
        pick_timeout: int,
        now: float,
    ) -> None:
        if not 2 <= len(players) <= 4:
            raise SpecchioError("raid_players", "Il raid è per 2-4 giocatori")
        self.players = players
        self.pick_timeout = pick_timeout
        self.deck = build_deck(seed, chars, forms_by_base(forms))
        self.round = 0
        self.team: dict[str, Character] = {}
        self.deadline = now + pick_timeout
        self.finished = False

    def turn(self) -> Player | None:
        return None if self.finished else self.players[self.round % len(self.players)]

    def cards(self) -> list[Character]:
        return hand(self.deck, self.round)

    def view(self) -> SpecchioView:
        t = self.turn()
        cards = [] if self.finished else self.cards()
        return SpecchioView(
            round=min(self.round, ROUNDS - 1),
            rounds=ROUNDS,
            turn_player_id=t.id if t else None,
            first_player_id=t.id if t else self.players[0].id,
            deadline=self.deadline,
            hand=[
                SpecchioCard(character=c, affinita=affinita.tutte(c), taken_by=None) for c in cards
            ],
        )

    def pick(
        self, pid: str, character_id: str, role: str, now: float, *, auto: bool = False
    ) -> list[ServerMessage]:
        turn = self.turn()
        if turn is None or turn.id != pid:
            raise SpecchioError("not_your_turn", "Non è il tuo turno")
        card = next((c for c in self.cards() if c.id == character_id), None)
        if card is None:
            raise SpecchioError("bad_card", "Carta non disponibile")
        if role not in ROLES or role in self.team:
            raise SpecchioError("bad_role", "Slot non libero")
        self.team[role] = card
        for p in self.players:  # la squadra è di tutti
            p.slots[role] = card
        self.round += 1
        if self.round >= ROUNDS:
            self.finished = True
        self.deadline = now + self.pick_timeout
        del auto
        return []

    def best_choice(self) -> tuple[str, str]:
        libere = [r for r in ROLES if r not in self.team]
        best = max(
            ((c, r) for c in self.cards() for r in libere),
            key=lambda t: (potenza_ruolo(t[0], t[1]), -ROLES.index(t[1]), t[0].id),
        )
        return best[0].id, best[1]

    def tick(self, now: float) -> list[ServerMessage]:
        t = self.turn()
        if t is None or now < self.deadline:
            return []
        cid, role = self.best_choice()
        self.pick(t.id, cid, role, now, auto=True)
        return []
