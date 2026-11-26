"""Voti della chat: offerte `!offro N` (asta) e piano di battaglia (`!f1 assalto`, `!carica`)."""

import random
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

# piano di battaglia votato dalla chat (fase "plan")
PLAN_FASE_RE = re.compile(r"^\s*!f([1-3])\s+(assalto|tecnica|guardia)\s*$", re.IGNORECASE)
PLAN_CARICA_RE = re.compile(r"^\s*!(subito|carica)\s*$", re.IGNORECASE)
PLAN_FORM_RE = re.compile(r"^\s*!form\s+(classica|muro|assalto|guerriglia)\s*$", re.IGNORECASE)


def parse_plan(text: str) -> tuple[str, str] | None:
    """(casella, valore) di un voto sul piano, oppure None. Caselle: f1, f2, f3, carica, form."""
    if m := PLAN_FASE_RE.match(text):
        return f"f{m.group(1)}", m.group(2).lower()
    if m := PLAN_CARICA_RE.match(text):
        return "carica", m.group(1).lower()
    if m := PLAN_FORM_RE.match(text):
        return "form", m.group(1).lower()
    return None


class ChatPlan:
    """Voti della chat sul piano: un voto per utente e casella, vale l'ultimo."""

    def __init__(self) -> None:
        self.votes: dict[str, dict[str, str]] = {}

    def add(self, user: str, casella: str, valore: str) -> None:
        self.votes.setdefault(casella, {})[user.lower()] = valore

    def tally(self) -> dict[str, dict[str, int]]:
        return {c: dict(Counter(v.values())) for c, v in self.votes.items()}

    def winner(self, casella: str, seed: str) -> str | None:
        """Il valore più votato; a parità sceglie a caso in modo deterministico dal seme."""
        counts = Counter(self.votes.get(casella, {}).values())
        if not counts:
            return None
        top = max(counts.values())
        return random.Random(f"{seed}:{casella}").choice(
            sorted(v for v, c in counts.items() if c == top)
        )


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
    if room.phase == "plan":
        plan: ChatPlan | None = room.extras.get("chat_plan")
        voto = parse_plan(text)
        if plan is None or voto is None:
            return False
        plan.add(user, *voto)
        return True
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
