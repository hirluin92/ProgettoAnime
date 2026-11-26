"""Macchina a stati dell'asta (regole 6.2). Sincrona e senza I/O: il tempo arriva da fuori."""

import random
from collections import deque

from app.engine.models import Character
from app.engine.roles import ROLES
from app.engine.scoring import potenza_ruolo
from app.rooms.models import AwaitRole, LotView, Player, RoomSettings
from app.rooms.protocol import (
    AuctionFinished,
    BidPlaced,
    ErrorMsg,
    LotAssigned,
    LotSkipped,
    LotStarted,
    LotWon,
    PlayerPassed,
    ServerMessage,
)

FORCE_AFTER_SKIPS = 5
MIN_EXTEND = 5


class BidError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message

    def msg(self) -> ErrorMsg:
        return ErrorMsg(code=self.code, message=self.message)


def best_role(player: Player, ch: Character) -> str:
    """Ruolo libero dove il personaggio rende di più (ruolo + ruolo firma)."""
    free = player.free_roles()
    return max(
        free,
        key=lambda r: (potenza_ruolo(ch, r), -ROLES.index(r)),
    )


class Auction:
    def __init__(
        self, players: dict[str, Player], settings: RoomSettings, pool: list[Character], seed: int
    ) -> None:
        self.players = players
        self.settings = settings
        self.rng = random.Random(seed)
        shuffled = list(pool)
        self.rng.shuffle(shuffled)
        self.queue: deque[Character] = deque(shuffled)
        self.lot: Character | None = None
        self.number = 0
        self.bid = 0
        self.bidder: str | None = None
        self.deadline = 0.0
        self.passed: set[str] = set()
        self.await_role: AwaitRole | None = None
        self.skips = 0
        self.finished = False

    # ---- stato ----
    def active(self) -> list[Player]:
        return [p for p in self.players.values() if not p.complete]

    @property
    def lots_left(self) -> int:
        return len(self.queue)

    def view(self) -> LotView | None:
        if self.lot is None:
            return None
        return LotView(
            number=self.number, character=self.lot, current_bid=self.bid, bidder_id=self.bidder,
            deadline=self.deadline, passed=sorted(self.passed), await_role=self.await_role,
        )  # fmt: skip

    def teams(self) -> dict[str, dict[str, Character | None]]:
        return {pid: dict(p.slots) for pid, p in self.players.items()}

    # ---- avvio e lotti ----
    def start(self, now: float) -> list[ServerMessage]:
        return self._next_lot(now)

    def _next_lot(self, now: float) -> list[ServerMessage]:
        msgs: list[ServerMessage] = []
        self.lot = None
        self.await_role = None
        while True:
            active = self.active()
            if not active or not self.queue:
                self.finished = True
                self.lot = None
                msgs.append(AuctionFinished(teams=self.teams()))
                return msgs
            lot = self.queue.popleft()
            forced = self.skips >= FORCE_AFTER_SKIPS
            if len(active) == 1 or forced:
                # un solo giocatore con slot liberi, o troppi lotti senza offerte: assegnato a 1
                most = max(len(p.free_roles()) for p in active)
                target = self.rng.choice([p for p in active if len(p.free_roles()) == most])
                self.number += 1
                msgs.append(LotStarted(number=self.number, character=lot, deadline=now, now=now))
                msgs.append(self._place(target, lot, 1, best_role(target, lot)))
                self.skips = 0
                continue
            self.number += 1
            self.lot = lot
            self.bid = 0
            self.bidder = None
            self.passed = set()
            self.deadline = now + self.settings.timer
            msgs.append(
                LotStarted(number=self.number, character=lot, deadline=self.deadline, now=now)
            )
            return msgs

    def _place(self, player: Player, ch: Character, amount: int, role: str) -> LotAssigned:
        player.budget -= amount
        player.slots[role] = ch
        return LotAssigned(player_id=player.id, character=ch, role=role, amount=amount)

    # ---- azioni dei giocatori ----
    def place_bid(self, pid: str, amount: int, now: float) -> list[ServerMessage]:
        p = self._require_participant(pid)
        if self.await_role is not None:
            raise BidError("awaiting_role", "Il lotto è già stato aggiudicato")
        if pid in self.passed:
            raise BidError("passed", "Hai già passato su questo lotto")
        if p.complete:
            raise BidError("team_full", "La tua squadra è completa")
        if pid == self.bidder:
            raise BidError("already_highest", "Sei già il miglior offerente")
        if amount <= self.bid:
            raise BidError("too_low", "L'offerta deve superare quella attuale")
        if amount < 1:
            raise BidError("too_low", "Offerta minima: 1")
        if p.budget - amount < len(p.free_roles()) - 1:
            raise BidError("reserve", "Devi tenere almeno 1 per ogni altro slot libero")
        self.bid = amount
        self.bidder = pid
        self.deadline = now + max(self.deadline - now, min(MIN_EXTEND, self.settings.timer))
        msgs: list[ServerMessage] = [
            BidPlaced(player_id=pid, amount=amount, deadline=self.deadline, now=now)
        ]
        return msgs + self._maybe_resolve(now)

    def pass_lot(self, pid: str, now: float) -> list[ServerMessage]:
        p = self._require_participant(pid)
        if self.await_role is not None:
            raise BidError("awaiting_role", "Il lotto è già stato aggiudicato")
        if p.complete:
            raise BidError("team_full", "La tua squadra è completa")
        if pid == self.bidder:
            raise BidError("already_highest", "Sei il miglior offerente")
        if pid in self.passed:
            raise BidError("passed", "Hai già passato")
        self.passed.add(pid)
        return [PlayerPassed(player_id=pid), *self._maybe_resolve(now)]

    def assign_role(self, pid: str, role: str, now: float) -> list[ServerMessage]:
        aw = self.await_role
        if aw is None or aw.player_id != pid:
            raise BidError("not_your_turn", "Non devi scegliere un ruolo")
        p = self.players[pid]
        if role not in p.free_roles():
            raise BidError("bad_role", "Ruolo non libero")
        return self._assign(p, role, now)

    def _assign(self, p: Player, role: str, now: float) -> list[ServerMessage]:
        assert self.lot is not None and self.await_role is not None
        msg = self._place(p, self.lot, self.await_role.amount, role)
        return [msg, *self._next_lot(now)]

    def _require_participant(self, pid: str) -> Player:
        if self.lot is None or self.finished:
            raise BidError("no_lot", "Nessun lotto in corso")
        if pid not in self.players:
            raise BidError("not_player", "Non sei un giocatore")
        return self.players[pid]

    # ---- tempo ----
    def tick(self, now: float) -> list[ServerMessage]:
        if self.finished or self.lot is None:
            return []
        msgs: list[ServerMessage] = []
        aw = self.await_role
        if aw is not None:
            if now >= aw.deadline:
                p = self.players[aw.player_id]
                msgs += self._assign(p, best_role(p, self.lot), now)
            return msgs
        for p in self.active():  # i giocatori assenti passano in automatico
            if (
                not p.is_chat
                and not p.connected
                and p.id not in self.passed
                and p.id != self.bidder
            ):
                self.passed.add(p.id)
                msgs.append(PlayerPassed(player_id=p.id))
        if now >= self.deadline:
            return msgs + self._resolve(now)
        return msgs + self._maybe_resolve(now)

    def _maybe_resolve(self, now: float) -> list[ServerMessage]:
        """Chiude subito il lotto se tutti gli altri hanno passato."""
        others = [p.id for p in self.active() if p.id != self.bidder]
        if all(o in self.passed for o in others):
            return self._resolve(now)
        return []

    def _resolve(self, now: float) -> list[ServerMessage]:
        assert self.lot is not None
        if self.bidder is None:
            lot = self.lot
            self.queue.append(lot)  # lo scartato torna in fondo al mazzo
            self.skips += 1
            return [LotSkipped(character=lot), *self._next_lot(now)]
        self.skips = 0
        winner = self.players[self.bidder]
        if winner.is_chat:
            self.await_role = AwaitRole(player_id=winner.id, amount=self.bid, deadline=now)
            return [
                LotWon(player_id=winner.id, amount=self.bid, role_deadline=None),
                *self._assign(winner, best_role(winner, self.lot), now),
            ]
        deadline = now + self.settings.role_timeout
        self.await_role = AwaitRole(player_id=winner.id, amount=self.bid, deadline=deadline)
        return [LotWon(player_id=winner.id, amount=self.bid, role_deadline=deadline)]
