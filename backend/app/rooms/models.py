import secrets
import time
from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import Field

from app.engine.affinita import affinita
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
    plan_timeout: int = Field(
        default=45, ge=0, le=180
    )  # secondi per il piano di battaglia; 0 = salta
    formato: Literal["girone", "eliminazione"] = "girone"  # formato del torneo
    modalita: Literal["asta", "specchio"] = "asta"  # asta con gli amici o draft a specchio (2)
    pick_timeout: int = Field(default=20, ge=5, le=120)  # secondi per scelta (specchio)


class PlayerView(Model):
    id: str
    name: str
    color: str
    budget: int
    slots: dict[str, Character | None]
    is_chat: bool
    connected: bool
    complete: bool
    ready: bool  # ha consegnato il piano di battaglia (la chat è sempre pronta)
    slot_aff: dict[str, int]  # affinità della carta in ogni slot occupato (punti %)


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
    affinita: dict[str, int]  # affinità del personaggio con ogni slot (punti %)


class MatchRef(Model):
    match_id: str
    a: str  # player id
    b: str
    winner: str | None  # None = pareggio
    total_a: int
    total_b: int
    bye: bool = False  # turno saltato (eliminazione): passa il giocatore a


class StandingRow(Model):
    player_id: str
    punti: int
    vittorie: int
    pareggi: int
    sconfitte: int
    totale: int


class MissionResult(Model):
    """La missione segreta di un giocatore, svelata a fine torneo."""

    player_id: str
    id: str
    nome: str
    descrizione: str
    riuscita: bool


class RoomArena(Model):
    id: str
    nome: str
    descrizione: str


class TournamentView(Model):
    giornate: list[list[MatchRef]]
    classifica: list[StandingRow]
    missioni: list[MissionResult] = Field(default_factory=list)
    formato: Literal["girone", "eliminazione"] = "girone"
    campione: str | None = None  # id del vincitore (solo eliminazione)


class SpecchioCard(Model):
    character: Character
    affinita: dict[str, int]
    taken_by: str | None  # id del giocatore che l'ha già scelta


class SpecchioView(Model):
    round: int  # 0-based
    rounds: int
    turn_player_id: str | None
    first_player_id: str
    deadline: float
    hand: list[SpecchioCard]


class RoomView(Model):
    code: str
    phase: Literal["lobby", "ban", "auction", "draft", "plan", "tournament"]
    host_id: str
    settings: RoomSettings
    players: list[PlayerView]
    lot: LotView | None
    lots_left: int
    bans: dict[str, list[Character]]
    ban_deadline: float | None
    plan_deadline: float | None
    draft: SpecchioView | None
    chat_plan: dict[str, dict[str, int]] | None  # voti della chat sul piano (fase piano)
    arena: RoomArena | None
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
    missione: str | None = None  # id della missione segreta (privata fino al torneo)
    plan: dict[str, Any] | None = None  # piano consegnato: tattiche, carica, formazione

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
            ready=self.is_chat or self.plan is not None,
            slot_aff={r: affinita(c, r) for r, c in self.slots.items() if c is not None},
        )  # fmt: skip


def now() -> float:
    return time.time()
