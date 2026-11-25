"""Offerte della chat: voti `!offro N` aggregati ogni secondo."""

import re
from collections import Counter
from collections.abc import Callable
from typing import TYPE_CHECKING

from app.rooms.auction import BidError
from app.rooms.protocol import ServerMessage

if TYPE_CHECKING:
    from app.rooms.manager import Room

OFFER_RE = re.compile(r"^\s*!offro\s+(\d{1,3})\s*$", re.IGNORECASE)
CHAT_ID = "chat"
INTERVAL = 1.0


def parse_offer(text: str) -> int | None:
    m = OFFER_RE.match(text)
    return int(m.group(1)) if m else None


class ChatVotes:
    def __init__(self, threshold: int) -> None:
        self.threshold = threshold
        self.votes: dict[str, int] = {}
        self.lot_number = -1
        self.last_tick = 0.0

    def reset(self, lot_number: int) -> None:
        self.votes = {}
        self.lot_number = lot_number

    def add(self, user: str, amount: int) -> None:
        self.votes[user.lower()] = amount  # un voto per utente per lotto: vale l'ultimo

    def best(self) -> int | None:
        """Il valore N più alto che ha ricevuto almeno `soglia` voti."""
        counts = Counter(self.votes.values())
        eligible = [n for n, c in counts.items() if c >= self.threshold]
        return max(eligible) if eligible else None


def feed_message(room: "Room", user: str, text: str) -> bool:
    """Registra un messaggio di chat sul lotto corrente. True se era un voto valido."""
    votes: ChatVotes | None = room.extras.get("chat_votes")
    amount = parse_offer(text)
    a = room.auction
    if votes is None or amount is None or a is None or a.lot is None:
        return False
    if votes.lot_number != a.number:
        votes.reset(a.number)
    votes.add(user, amount)
    return True


def make_chat_tick(votes: ChatVotes) -> Callable[["Room", float], list[ServerMessage]]:
    def tick(room: "Room", now: float) -> list[ServerMessage]:
        a = room.auction
        if a is None or a.lot is None or a.await_role is not None or CHAT_ID not in room.players:
            return []
        votes.threshold = room.settings.chat_threshold
        if votes.lot_number != a.number:
            votes.reset(a.number)
        if now - votes.last_tick < INTERVAL:
            return []
        votes.last_tick = now
        amount = votes.best()
        if amount is None or a.bidder == CHAT_ID or amount <= a.bid:
            return []
        try:
            return a.place_bid(CHAT_ID, amount, now)
        except BidError:
            return []  # offerta non valida secondo le regole 6.2: ignorata

    return tick
