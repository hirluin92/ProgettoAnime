from typing import Annotated, Any, Literal

from pydantic import Field

from app.duello_api import MossaIn, StatoView
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


class Ban(Model):
    type: Literal["ban"] = "ban"
    character_id: str


class Bid(Model):
    type: Literal["bid"] = "bid"
    amount: int


class Pass(Model):
    type: Literal["pass"] = "pass"


class AssignRole(Model):
    type: Literal["assign_role"] = "assign_role"
    role: str


class Pick(Model):
    """Draft a specchio: carta scelta e slot dove metterla."""

    type: Literal["pick"] = "pick"
    character_id: str
    role: str


class Plan(Model):
    """Piano di battaglia: tattiche per le 3 fasi (omesse = a caso), mossa finale, formazione."""

    type: Literal["plan"] = "plan"
    tattiche: list[str] | None = Field(default=None, min_length=3, max_length=3)
    carica: Literal["subito", "carica"] = "subito"
    formazione: str = "classica"


class DuelloMosse(Model):
    """Le carte giocate in questo turno del duello (segrete fino alla rivelazione)."""

    type: Literal["duello_mosse"] = "duello_mosse"
    mosse: list[MossaIn] = Field(default_factory=list, max_length=12)


class UpdateSettings(Model):
    type: Literal["update_settings"] = "update_settings"
    settings: RoomSettings


ClientMessage = Annotated[
    Join
    | Spectate
    | Start
    | Ban
    | Bid
    | Pass
    | AssignRole
    | Pick
    | Plan
    | DuelloMosse
    | UpdateSettings,
    Field(discriminator="type"),
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
    affinita: dict[str, int]


class Mission(Model):
    """Missione segreta del giocatore (messaggio privato)."""

    type: Literal["mission"] = "mission"
    id: str
    nome: str
    descrizione: str


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


class DuelloAggiornamento(Model):
    """Il duello del giocatore (messaggio privato): plancia, mano, eventi dell'ultimo turno."""

    type: Literal["duello"] = "duello"
    avversario: str | None  # id dell'avversario; None = turno di riposo
    vista: StatoView
    eventi: list[dict[str, Any]]  # eventi dell'ultimo turno risolto (dal tuo punto di vista)
    scadenza: float
    now: float
    inviate: bool  # hai già consegnato le mosse di questo turno
    avversario_pronto: bool
    nuovo: bool  # primo messaggio di un duello (anche dopo una riconnessione)
    giornata: int


class ErrorMsg(Model):
    type: Literal["error"] = "error"
    code: str
    message: str


ServerMessage = Annotated[
    Joined | RoomState | Mission | LotStarted | BidPlaced | PlayerPassed | LotWon | LotAssigned
    | LotSkipped | AuctionFinished | TournamentResult | DuelloAggiornamento | ErrorMsg,
    Field(discriminator="type"),
]  # fmt: skip
