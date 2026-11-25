from typing import Annotated, Literal

from pydantic import BaseModel, Field

Side = Literal["A", "B"]


class Character(BaseModel):
    id: str
    nome: str
    anime: str
    ruolo_firma: str
    tags: list[str] = Field(min_length=1, max_length=3)
    rating: int = Field(ge=55, le=99)


class Duo(BaseModel):
    a: str
    b: str
    nome: str


class CounterRule(BaseModel):
    vince: str
    perde: str


class Ruleset(BaseModel):
    """Dati di gioco passati al motore: il motore non legge file."""

    counters: list[CounterRule]
    duos: list[Duo]


class Team(BaseModel):
    nome: str
    # 7 personaggi, nell'ordine dei ruoli in roles.ROLES
    members: list[Character] = Field(min_length=7, max_length=7)


class Breakdown(BaseModel):
    base: int = 0
    ruolo: int = 0
    firma: int = 0
    forma: int = 0
    counter: int = 0
    duo: int = 0

    def total(self) -> int:
        return self.base + self.ruolo + self.firma + self.forma + self.counter + self.duo


class Ingresso(BaseModel):
    tipo: Literal["ingresso"] = "ingresso"


class Duello(BaseModel):
    tipo: Literal["duello"] = "duello"
    ruolo: str
    idx: int


class Attacco(BaseModel):
    tipo: Literal["attacco"] = "attacco"
    da: Side
    idx: int
    danno: int


class Counter(BaseModel):
    tipo: Literal["counter"] = "counter"
    da: Side
    rel: str
    bonus: int
    danno: int


class Combo(BaseModel):
    tipo: Literal["combo"] = "combo"
    da: Side
    duo: tuple[int, int]
    nome: str
    bonus: int
    danno: int


class Ko(BaseModel):
    tipo: Literal["ko"] = "ko"
    da: Side
    danno: int


Event = Annotated[Ingresso | Duello | Attacco | Counter | Combo | Ko, Field(discriminator="tipo")]


class MatchResult(BaseModel):
    seed: int
    totali: dict[Side, int]
    dettaglio: dict[Side, Breakdown]
    vincitore: Side
    pareggio: bool
    eventi: list[Event]
