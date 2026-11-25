from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Side = Literal["A", "B"]


class Model(BaseModel):
    """Base: i campi con default risultano obbligatori nello schema (tipi TS precisi)."""

    model_config = ConfigDict(json_schema_serialization_defaults_required=True)


class Character(Model):
    id: str
    nome: str
    anime: str
    ruolo_firma: str
    tags: list[str] = Field(min_length=1, max_length=3)
    rating: int = Field(ge=55, le=99)
    immagine_url: str | None = None


class Duo(Model):
    a: str
    b: str
    nome: str


class CounterRule(Model):
    vince: str
    perde: str


class Ruleset(Model):
    """Dati di gioco passati al motore: il motore non legge file."""

    counters: list[CounterRule]
    duos: list[Duo]


class Team(Model):
    nome: str
    # 7 personaggi, nell'ordine dei ruoli in roles.ROLES
    members: list[Character] = Field(min_length=7, max_length=7)


class Breakdown(Model):
    base: int = 0
    ruolo: int = 0
    firma: int = 0
    forma: int = 0
    counter: int = 0
    duo: int = 0

    def total(self) -> int:
        return self.base + self.ruolo + self.firma + self.forma + self.counter + self.duo


class Ingresso(Model):
    tipo: Literal["ingresso"] = "ingresso"


class Duello(Model):
    tipo: Literal["duello"] = "duello"
    ruolo: str
    idx: int


class Attacco(Model):
    tipo: Literal["attacco"] = "attacco"
    da: Side
    idx: int
    danno: int


class Counter(Model):
    tipo: Literal["counter"] = "counter"
    da: Side
    rel: str
    bonus: int
    danno: int


class Combo(Model):
    tipo: Literal["combo"] = "combo"
    da: Side
    duo: list[int] = Field(min_length=2, max_length=2)
    nome: str
    bonus: int
    danno: int


class Ko(Model):
    tipo: Literal["ko"] = "ko"
    da: Side
    danno: int


Event = Annotated[Ingresso | Duello | Attacco | Counter | Combo | Ko, Field(discriminator="tipo")]


class MatchResult(Model):
    seed: int
    squadre: dict[Side, Team]
    potenze: dict[Side, list[int]]
    totali: dict[Side, int]
    dettaglio: dict[Side, Breakdown]
    vincitore: Side
    pareggio: bool
    eventi: list[Event]
