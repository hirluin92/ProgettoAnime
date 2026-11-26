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
    # Forme alternative (V3): stesso personaggio, scheda diversa
    forma: str | None = None
    base_id: str | None = None


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
    rivalita: list[Duo] = Field(default_factory=list)


class Team(Model):
    nome: str
    # 7 personaggi, nell'ordine dei ruoli in roles.ROLES
    members: list[Character] = Field(min_length=7, max_length=7)
    # bonus della missione segreta completata (es. 0.03 = +3% attacco e vita)
    bonus_missione: float = 0.0


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


class RivalitaAttiva(Model):
    """Due personaggi su lati opposti con un conto in sospeso: +8% di danno l'uno contro l'altro."""

    nome: str
    a: int  # indice nella squadra A
    b: int  # indice nella squadra B


class Stato(Model):
    """Fotografia del campo dopo un'azione (così l'interfaccia non deve rifare i conti)."""

    hp: dict[Side, list[int]]
    energia: dict[Side, list[int]]
    scudo: dict[Side, list[int]]
    # barra del pubblico (0-100) per lato
    hype: dict[Side, int] = Field(default_factory=lambda: {"A": 0, "B": 0})  # type: ignore[arg-type]


class Esito(Model):
    lato: Side
    idx: int
    delta: int  # negativo = danno, positivo = cura
    scudo: int
    ko: bool
    schivata: bool
    crit: bool
    stordito: bool
    # stato alterato applicato o subito in questo evento: bruciatura, veleno, sigillo, corrosione
    effetto: str | None = None


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


class Effetti(Model):
    """Danni da stati alterati a fine turno (bruciatura, veleno, corrosione)."""

    tipo: Literal["effetti"] = "effetti"
    turno: int
    esiti: list[Esito]
    stato: Stato


class Respiro(Model):
    """Ultimo respiro: l'ultimo superstite di una squadra riceve un bonus drammatico."""

    tipo: Literal["respiro"] = "respiro"
    turno: int
    lato: Side
    idx: int
    stato: Stato


class Fase(Model):
    """Inizio di una fase: le tattiche scelte dai due lati e chi vince il confronto."""

    tipo: Literal["fase"] = "fase"
    turno: int
    fase: int  # 1-3
    tattica: dict[Side, str]
    esito: Literal["A", "B", "pari"]


class Fine(Model):
    tipo: Literal["fine"] = "fine"
    vincitore: Side
    motivo: Literal["ko", "tempo"]


Event = Annotated[
    Ingresso | Turno | Fase | Azione | Effetti | Respiro | Fine, Field(discriminator="tipo")
]


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
    # tattiche scelte per le 3 fasi (vuoto nelle partite senza tattiche e in quelle vecchie)
    tattiche: dict[Side, list[str]] = Field(default_factory=dict)
    arena: str | None = None
    formazione: dict[Side, str] = Field(default_factory=dict)
    rivalita: list[RivalitaAttiva] = Field(default_factory=list)
    carica: dict[Side, str] = Field(default_factory=dict)  # subito | carica, per lato
    eventi: list[Event]
