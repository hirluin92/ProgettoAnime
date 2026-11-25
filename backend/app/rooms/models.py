import secrets
import time
from dataclasses import dataclass, field
from typing import Literal

from pydantic import Field

from app.engine.models import Character, Model
from app.engine.roles import ROLES

MAX_PLAYERS = 20
MIN_PLAYERS = 2
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # niente O, I, 0, 1
COLORS = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0",
    "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff", "#9a6324", "#fffac8",
    "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080",
]  # fmt: skip


class RoomSettings(Model):
    budget: int = Field(default=50, ge=10, le=500)
    timer: int = Field(default=10, ge=1, le=60)
    role_timeout: int = Field(default=8, ge=1, le=60)
    anime: list[str] = []  # vuoto = tutti
    chat_threshold: int = Field(default=3, ge=1, le=100)
    bans_per_player: int = Field(default=0, ge=0, le=3)  # 0 = nessuna fase di ban


class PlayerView(Model):
    id: str
    name: str
    color: str
    budget: int
    slots: dict[str, Character | None]
    is_chat: bool
    connected: bool
    complete: bool


class AwaitRole(Model):
    player_id: str
    amount: int
    deadline: float


class LotView(Model):
    number: int
    character: Character
    current_bid: int
    bidder_id: str | None
    deadline: float
    passed: list[str]
    await_role: AwaitRole | None


class MatchRef(Model):
    match_id: str
    a: str  # player id
    b: str
    winner: str | None  # None = pareggio
    total_a: int
    total_b: int


class StandingRow(Model):
    player_id: str
    punti: int
    vittorie: int
    pareggi: int
    sconfitte: int
    totale: int


class TournamentView(Model):
    giornate: list[list[MatchRef]]
    classifica: list[StandingRow]


class RoomView(Model):
    code: str
    phase: Literal["lobby", "ban", "auction", "tournament"]
    host_id: str
    settings: RoomSettings
    players: list[PlayerView]
    lot: LotView | None
    lots_left: int
    bans: dict[str, list[Character]]
    ban_deadline: float | None
    tournament: TournamentView | None
    streamer_channel: str | None
    server_time: float


@dataclass
class Player:
    id: str
    name: str
    color: str
    budget: int
    token: str = field(default_factory=lambda: secrets.token_urlsafe(16))
    slots: dict[str, Character | None] = field(default_factory=lambda: dict.fromkeys(ROLES))
    is_chat: bool = False
    connected: bool = False
    left_at: float | None = None

    def free_roles(self) -> list[str]:
        return [r for r in ROLES if self.slots[r] is None]

    @property
    def complete(self) -> bool:
        return not self.free_roles()

    def view(self) -> PlayerView:
        return PlayerView(
            id=self.id, name=self.name, color=self.color, budget=self.budget,
            slots=self.slots, is_chat=self.is_chat,
            connected=self.connected or self.is_chat, complete=self.complete,
        )  # fmt: skip


def now() -> float:
    return time.time()
