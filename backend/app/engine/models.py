from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Side = Literal["A", "B"]
VERSIONE = 2


class Model(BaseModel):
    """Base: i campi con default risultano obbligatori nello schema (tipi TS precisi)."""

    model_config = ConfigDict(json_schema_serialization_defaults_required=True)


class Mossa(Model):
    nome: str
    effetto: str


class Passiva(Model):
    nome: str
    effetto: str


class Character(Model):
    id: str
    nome: str
    anime: str
    ruolo_firma: str
    tags: list[str] = Field(min_length=1, max_length=3)
    rating: int = Field(ge=55, le=99)
    immagine_url: str | None = None
    # Scheda di combattimento v2 (unita da data_loader da schede.json)
    arch: str = "BRU"
    mossa: Mossa = Mossa(nome="Colpo speciale", effetto="strike")
    passiva: Passiva = Passiva(nome="Tempra", effetto="armor")
    gruppi: list[str] = Field(default_factory=list)
    costo: int = Field(default=6, ge=1, le=14)  # prezzo misurato dal simulatore


class Duo(Model):
    a: str
    b: str
    nome: str


class Tratto(Model):
    id: str
    nome: str
    stat: str
    soglie: dict[str, int]


class Ruleset(Model):
    """Dati di gioco passati al motore: il motore non legge file."""

    duos: list[Duo]
    tratti: list[Tratto]


class Team(Model):
    nome: str
    # 7 personaggi, nell'ordine dei ruoli in roles.ROLES
    members: list[Character] = Field(min_length=7, max_length=7)


class Unita(Model):
    """Statistiche iniziali di un combattente (dopo ruolo, sinergie e legami)."""

    hp: int
    atk: int
    dif: int
    vel: int
    adatto: bool


class Sinergia(Model):
    lato: Side
    nome: str
    stat: str
    valore: int
    membri: int


class Stato(Model):
    """Fotografia del campo dopo un'azione (così l'interfaccia non deve rifare i conti)."""

    hp: dict[Side, list[int]]
    energia: dict[Side, list[int]]
    scudo: dict[Side, list[int]]


class Esito(Model):
    lato: Side
    idx: int
    delta: int  # negativo = danno, positivo = cura
    scudo: int
    ko: bool
    schivata: bool
    crit: bool
    stordito: bool


class Ingresso(Model):
    tipo: Literal["ingresso"] = "ingresso"
    stato: Stato


class Turno(Model):
    tipo: Literal["turno"] = "turno"
    n: int


class Azione(Model):
    tipo: Literal["azione"] = "azione"
    turno: int
    da: Side
    idx: int
    mossa: str
    speciale: bool
    effetto: str
    esiti: list[Esito]
    stato: Stato


class Fine(Model):
    tipo: Literal["fine"] = "fine"
    vincitore: Side
    motivo: Literal["ko", "tempo"]


Event = Annotated[Ingresso | Turno | Azione | Fine, Field(discriminator="tipo")]


class MatchResult(Model):
    seed: int
    versione: int = VERSIONE
    squadre: dict[Side, Team]
    unita: dict[Side, list[Unita]]
    potenze: dict[Side, list[int]]
    sinergie: list[Sinergia]
    totali: dict[Side, int]  # HP rimasti, in % della squadra
    vincitore: Side
    pareggio: bool
    turni: int
    eventi: list[Event]
