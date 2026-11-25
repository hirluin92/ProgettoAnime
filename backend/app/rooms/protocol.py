from typing import Annotated, Literal

from pydantic import Field

from app.engine.models import Character, Model
from app.rooms.models import RoomSettings, RoomView, TournamentView

# ---- Client -> server ----


class Join(Model):
    type: Literal["join"] = "join"
    name: str = Field(default="", max_length=24)
    token: str | None = None


class Spectate(Model):
    type: Literal["spectate"] = "spectate"


class Start(Model):
    type: Literal["start"] = "start"


class Bid(Model):
    type: Literal["bid"] = "bid"
    amount: int


class Pass(Model):
    type: Literal["pass"] = "pass"


class AssignRole(Model):
    type: Literal["assign_role"] = "assign_role"
    role: str


class UpdateSettings(Model):
    type: Literal["update_settings"] = "update_settings"
    settings: RoomSettings


ClientMessage = Annotated[
    Join | Spectate | Start | Bid | Pass | AssignRole | UpdateSettings, Field(discriminator="type")
]

# ---- Server -> client ----


class Joined(Model):
    type: Literal["joined"] = "joined"
    player_id: str
    token: str


class RoomState(Model):
    type: Literal["room_state"] = "room_state"
    room: RoomView


class LotStarted(Model):
    type: Literal["lot_started"] = "lot_started"
    number: int
    character: Character
    deadline: float
    now: float


class BidPlaced(Model):
    type: Literal["bid_placed"] = "bid_placed"
    player_id: str
    amount: int
    deadline: float
    now: float


class PlayerPassed(Model):
    type: Literal["player_passed"] = "player_passed"
    player_id: str


class LotWon(Model):
    type: Literal["lot_won"] = "lot_won"
    player_id: str
    amount: int
    role_deadline: float | None  # None = ruolo scelto subito dal server


class LotAssigned(Model):
    type: Literal["lot_assigned"] = "lot_assigned"
    player_id: str
    character: Character
    role: str
    amount: int


class LotSkipped(Model):
    type: Literal["lot_skipped"] = "lot_skipped"
    character: Character


class AuctionFinished(Model):
    type: Literal["auction_finished"] = "auction_finished"
    teams: dict[str, dict[str, Character | None]]


class TournamentResult(Model):
    type: Literal["tournament_result"] = "tournament_result"
    tournament: TournamentView


class ErrorMsg(Model):
    type: Literal["error"] = "error"
    code: str
    message: str


ServerMessage = Annotated[
    Joined | RoomState | LotStarted | BidPlaced | PlayerPassed | LotWon | LotAssigned
    | LotSkipped | AuctionFinished | TournamentResult | ErrorMsg,
    Field(discriminator="type"),
]  # fmt: skip
