"""Profilo, XP, livelli, obiettivi giornalieri, collezione e stagioni (V3).

Il profilo è anonimo: un id casuale conservato nel browser. Le regole (XP, livelli, obiettivi)
sono funzioni pure; l'accesso al database sta in `assegna_premio` e nel router.
"""

import random
import re
from collections.abc import Callable
from dataclasses import dataclass

from fastapi import APIRouter, HTTPException
from pydantic import Field
from sqlalchemy import select

from app.data_loader import load_characters, load_forms
from app.db.models import ProfileDay, ProfileRow, SeasonScore
from app.db.session import session_scope
from app.engine.models import Fase, MatchResult, Model
from app.tempo import giorno_italia

router = APIRouter(prefix="/api")

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
XP_OBIETTIVO = 20
XP_PRIMO_GIOCO = 10
TOP_STAGIONE = 20

TITOLI: tuple[tuple[int, str], ...] = (
    (1, "Recluta"),
    (3, "Sfidante"),
    (5, "Veterano"),
    (8, "Stratega"),
    (12, "Campione"),
    (18, "Leggenda"),
)


# ---------- regole pure ----------
def crediti_per(xp: int) -> int:
    """Crediti guadagnati da una partita: metà degli XP (i crediti non si comprano con denaro)."""
    return max(1, xp // 2)


def xp_per_livello(livello: int) -> int:
    """XP totali necessari per raggiungere un livello (livello 1 = 0)."""
    return 60 * (livello - 1) ** 2


def livello_per_xp(xp: int) -> int:
    livello = 1
    while xp >= xp_per_livello(livello + 1):
        livello += 1
    return livello


def titolo_per_livello(livello: int) -> str:
    return [t for soglia, t in TITOLI if livello >= soglia][-1]


@dataclass(frozen=True)
class Partita:
    """Quello che serve a decidere premi e obiettivi di una partita finita."""

    result: MatchResult
    missione_ok: bool
    kind: str  # "veloce" | "sfida"
    forme: int  # quante carte in forma alternativa nella squadra del giocatore

    @property
    def vinto(self) -> bool:
        return self.result.vincitore == "A" and not self.result.pareggio

    @property
    def ko_totale(self) -> bool:
        return self.vinto and self.result.totali["B"] == 0

    @property
    def fasi_vinte(self) -> int:
        return sum(1 for e in self.result.eventi if isinstance(e, Fase) and e.esito == "A")


def xp_partita(p: Partita) -> int:
    return (
        20
        + (30 if p.vinto else 0)
        + (10 if p.ko_totale else 0)
        + (15 if p.missione_ok else 0)
        + (25 if p.kind == "sfida" else 0)
    )


@dataclass(frozen=True)
class Obiettivo:
    id: str
    nome: str
    descrizione: str
    check: Callable[[Partita], bool]


OBIETTIVI: dict[str, Obiettivo] = {
    o.id: o
    for o in (
        Obiettivo("vinci", "Vittoria", "Vinci una partita.", lambda p: p.vinto),
        Obiettivo(
            "missione",
            "Missione compiuta",
            "Completa la tua missione segreta.",
            lambda p: p.missione_ok,
        ),
        Obiettivo(
            "sfida", "Sfida accettata", "Gioca la sfida del giorno.", lambda p: p.kind == "sfida"
        ),
        Obiettivo(
            "ko",
            "Annientamento",
            "Vinci mandando K.O. tutta la squadra avversaria.",
            lambda p: p.ko_totale,
        ),
        Obiettivo(
            "rivalita",
            "Vecchi conti",
            "Vinci con una rivalità attiva in campo.",
            lambda p: p.vinto and bool(p.result.rivalita),
        ),
        Obiettivo(
            "forma",
            "Nuova forma",
            "Schiera un personaggio in forma alternativa.",
            lambda p: p.forme > 0,
        ),
        Obiettivo(
            "fasi",
            "Stratega",
            "Vinci almeno 2 fasi su 3 nel confronto delle tattiche.",
            lambda p: p.fasi_vinte >= 2,
        ),
        Obiettivo(
            "carica",
            "Sangue freddo",
            "Vinci trattenendo la mossa finale.",
            lambda p: p.vinto and p.result.carica.get("A") == "carica",
        ),
    )
}


def obiettivi_del_giorno(giorno: str) -> list[Obiettivo]:
    rnd = random.Random(f"obiettivi:{giorno}")
    return [OBIETTIVI[i] for i in rnd.sample(list(OBIETTIVI), 3)]


def stagione_di(giorno: str) -> str:
    return giorno[:7]


def punti_stagione(p: Partita, score: int | None) -> int:
    if p.kind == "sfida" and score is not None:
        return max(1, score // 10)
    return 3 if p.vinto else 1


# ---------- modelli ----------
class ObiettivoView(Model):
    id: str
    nome: str
    descrizione: str
    fatto: bool


class StagioneView(Model):
    id: str
    punti: int
    posizione: int | None


class ProfileView(Model):
    id: str
    name: str
    xp: int
    livello: int
    xp_livello: int  # XP di inizio del livello attuale
    xp_prossimo: int  # XP del livello successivo
    titolo: str
    partite: int
    vittorie: int
    best_scala: int  # gradino più alto raggiunto nella Scala
    elo: int = 1200  # punteggio di abilità nei Duelli
    crediti: int = 0  # valuta del gioco: si guadagna solo giocando
    pity: int = 0  # pacchetti aperti dall'ultima leggendaria
    username: str | None = None  # None = profilo anonimo, non ancora protetto da password
    collezione: list[str]
    collezione_totale: int
    obiettivi: list[ObiettivoView]
    stagione: StagioneView


class Premio(Model):
    xp: int
    xp_totale: int
    livello_prima: int
    livello_dopo: int
    titolo: str
    obiettivi_completati: list[ObiettivoView]
    punti_stagione: int
    nuove_carte: int
    crediti: int = 0  # crediti guadagnati con questa partita
    elo_prima: int | None = None
    elo_dopo: int | None = None


class ProfileIn(Model):
    id: str | None = None
    name: str = Field(min_length=1, max_length=24)


class SeasonRow(Model):
    name: str
    points: int


class CollectionItem(Model):
    id: str
    nome: str
    anime: str
    rating: int
    forma: str | None


class SeasonView(Model):
    season: str
    top: list[SeasonRow]


TETTO_PREMI_GIORNO = 30  # partite al giorno che danno XP e crediti: oltre, si gioca ma senza premio


def premio_consentito(s, profile_id: str, giorno: str) -> bool:  # type: ignore[no-untyped-def]
    """Conta una partita premiata nel giorno; falso se il tetto è già raggiunto."""
    day = s.scalar(
        select(ProfileDay).where(ProfileDay.profile_id == profile_id, ProfileDay.day == giorno)
    )
    if day is None:
        day = ProfileDay(profile_id=profile_id, day=giorno, fatti=[], primo=False, premiate=0)
        s.add(day)
    if day.premiate >= TETTO_PREMI_GIORNO:
        return False
    day.premiate += 1
    return True


def oggi() -> str:
    return giorno_italia()


def totale_collezione() -> int:
    return len(load_characters()) + len(load_forms())


# ---------- accesso ai dati ----------
def _view(s, row: ProfileRow, giorno: str) -> ProfileView:  # type: ignore[no-untyped-def]
    day = s.scalar(
        select(ProfileDay).where(ProfileDay.profile_id == row.id, ProfileDay.day == giorno)
    )
    fatti = set(day.fatti) if day else set()
    stagione = stagione_di(giorno)
    mio = s.scalar(
        select(SeasonScore).where(SeasonScore.season == stagione, SeasonScore.profile_id == row.id)
    )
    punti = mio.points if mio else 0
    pos = None
    if mio:
        pos = 1 + len(
            s.scalars(
                select(SeasonScore.id).where(
                    SeasonScore.season == stagione, SeasonScore.points > mio.points
                )
            ).all()
        )
    lv = livello_per_xp(row.xp)
    return ProfileView(
        id=row.id,
        name=row.name,
        xp=row.xp,
        livello=lv,
        xp_livello=xp_per_livello(lv),
        xp_prossimo=xp_per_livello(lv + 1),
        titolo=titolo_per_livello(lv),
        partite=row.partite,
        vittorie=row.vittorie,
        best_scala=row.best_scala,
        elo=row.elo,
        username=row.username,
        crediti=row.crediti,
        pity=row.pity,
        collezione=sorted(row.collezione),
        collezione_totale=totale_collezione(),
        obiettivi=[
            ObiettivoView(id=o.id, nome=o.nome, descrizione=o.descrizione, fatto=o.id in fatti)
            for o in obiettivi_del_giorno(giorno)
        ],
        stagione=StagioneView(id=stagione, punti=punti, posizione=pos),
    )


def assegna_premio(
    profile_id: str | None, partita: Partita, team_ids: list[str], score: int | None = None
) -> Premio | None:
    """Assegna XP, obiettivi, collezione e punti stagione a fine partita (se c'è un profilo)."""
    if not profile_id or not UUID_RE.match(profile_id):
        return None
    giorno = oggi()
    with session_scope() as s:
        row = s.get(ProfileRow, profile_id, with_for_update=True)
        if row is None or not premio_consentito(s, profile_id, giorno):
            return None
        prima = livello_per_xp(row.xp)
        day = s.scalar(
            select(ProfileDay).where(ProfileDay.profile_id == profile_id, ProfileDay.day == giorno)
        )
        if day is None:
            day = ProfileDay(profile_id=profile_id, day=giorno, fatti=[], primo=False)
            s.add(day)
        guadagno = xp_partita(partita)
        if not day.primo:
            guadagno += XP_PRIMO_GIOCO
            day.primo = True
        nuovi = [
            o for o in obiettivi_del_giorno(giorno) if o.id not in day.fatti and o.check(partita)
        ]
        day.fatti = [*day.fatti, *(o.id for o in nuovi)]
        guadagno += XP_OBIETTIVO * len(nuovi)
        row.xp += guadagno
        cr = crediti_per(guadagno)
        row.crediti += cr
        row.partite += 1
        row.vittorie += int(partita.vinto)
        prima_coll = set(row.collezione)
        row.collezione = sorted(prima_coll | set(team_ids))
        pts = punti_stagione(partita, score)
        stag = stagione_di(giorno)
        sc = s.scalar(
            select(SeasonScore).where(SeasonScore.season == stag, SeasonScore.profile_id == row.id)
        )
        if sc is None:
            s.add(SeasonScore(season=stag, profile_id=row.id, name=row.name, points=pts))
        else:
            sc.points += pts
            sc.name = row.name
        dopo = livello_per_xp(row.xp)
        return Premio(
            xp=guadagno,
            crediti=cr,
            xp_totale=row.xp,
            livello_prima=prima,
            livello_dopo=dopo,
            titolo=titolo_per_livello(dopo),
            obiettivi_completati=[
                ObiettivoView(id=o.id, nome=o.nome, descrizione=o.descrizione, fatto=True)
                for o in nuovi
            ],
            punti_stagione=pts,
            nuove_carte=len(set(team_ids) - prima_coll),
        )


def assegna_premio_scala(
    profile_id: str | None, gradini: int, team_ids: list[str]
) -> Premio | None:
    """Fine di una corsa della Scala: XP e punti stagione in base ai gradini vinti."""
    if not profile_id or not UUID_RE.match(profile_id):
        return None
    with session_scope() as s:
        row = s.get(ProfileRow, profile_id, with_for_update=True)
        if row is None or not premio_consentito(s, profile_id, oggi()):
            return None
        prima = livello_per_xp(row.xp)
        guadagno = 20 + 15 * gradini
        row.xp += guadagno
        cr = crediti_per(guadagno)
        row.crediti += cr
        row.best_scala = max(row.best_scala, gradini)
        prima_coll = set(row.collezione)
        row.collezione = sorted(prima_coll | set(team_ids))
        pts = max(1, gradini * 2)
        stag = stagione_di(oggi())
        sc = s.scalar(
            select(SeasonScore).where(SeasonScore.season == stag, SeasonScore.profile_id == row.id)
        )
        if sc is None:
            s.add(SeasonScore(season=stag, profile_id=row.id, name=row.name, points=pts))
        else:
            sc.points += pts
            sc.name = row.name
        dopo = livello_per_xp(row.xp)
        return Premio(
            xp=guadagno,
            crediti=cr,
            xp_totale=row.xp,
            livello_prima=prima,
            livello_dopo=dopo,
            titolo=titolo_per_livello(dopo),
            obiettivi_completati=[],
            punti_stagione=pts,
            nuove_carte=len(set(team_ids) - prima_coll),
        )


ELO_CPU = {"facile": 1000, "normale": 1250, "difficile": 1500}
ELO_K = 24


def nuovo_elo(mio: int, avversario: int, esito: float) -> int:
    """ELO classico: `esito` 1 = vittoria, 0,5 = pareggio, 0 = sconfitta."""
    atteso = 1 / (1 + 10 ** ((avversario - mio) / 400))
    return max(100, round(mio + ELO_K * (esito - atteso)))


def assegna_premio_duello(
    profile_id: str | None,
    vinto: bool | None,
    livello: str,
    team_ids: list[str],
    conta_elo: bool = True,
) -> Premio | None:
    """Fine di un duello: XP, punti stagione e collezione."""
    if not profile_id or not UUID_RE.match(profile_id):
        return None
    with session_scope() as s:
        row = s.get(ProfileRow, profile_id, with_for_update=True)
        if row is None or not premio_consentito(s, profile_id, oggi()):
            return None
        prima = livello_per_xp(row.xp)
        bonus = {"facile": 0, "normale": 10, "difficile": 25}.get(livello, 0)
        guadagno = 20 + (30 + bonus if vinto else 0)
        row.xp += guadagno
        cr = crediti_per(guadagno)
        row.crediti += cr
        row.partite += 1
        row.vittorie += int(bool(vinto))
        prima_coll = set(row.collezione)
        row.collezione = sorted(prima_coll | set(team_ids))
        elo_prima = row.elo
        if conta_elo:
            esito = 0.5 if vinto is None else (1.0 if vinto else 0.0)
            row.elo = nuovo_elo(row.elo, ELO_CPU.get(livello, 1200), esito)
        pts = (3 if vinto else 1) + (2 if vinto and livello == "difficile" else 0)
        stag = stagione_di(oggi())
        sc = s.scalar(
            select(SeasonScore).where(SeasonScore.season == stag, SeasonScore.profile_id == row.id)
        )
        if sc is None:
            s.add(SeasonScore(season=stag, profile_id=row.id, name=row.name, points=pts))
        else:
            sc.points += pts
            sc.name = row.name
        dopo = livello_per_xp(row.xp)
        return Premio(
            xp=guadagno,
            crediti=cr,
            xp_totale=row.xp,
            livello_prima=prima,
            livello_dopo=dopo,
            titolo=titolo_per_livello(dopo),
            obiettivi_completati=[],
            punti_stagione=pts,
            nuove_carte=len(set(team_ids) - prima_coll),
            elo_prima=elo_prima,
            elo_dopo=row.elo,
        )


# ---------- API ----------
@router.post("/profile")
def upsert_profile(body: ProfileIn) -> ProfileView:
    name = body.name.strip()[:24]
    if not name:
        raise HTTPException(422, "serve un nome")
    if body.id is not None and not UUID_RE.match(body.id):
        raise HTTPException(422, "id profilo non valido")
    pid = body.id or _new_id()
    with session_scope() as s:
        row = s.get(ProfileRow, pid)
        if row is None:
            row = ProfileRow(id=pid, name=name, xp=0, partite=0, vittorie=0, collezione=[])
            s.add(row)
        else:
            row.name = name
        s.flush()
        return _view(s, row, oggi())


@router.get("/profile/{profile_id}")
def get_profile(profile_id: str) -> ProfileView:
    if not UUID_RE.match(profile_id):
        raise HTTPException(422, "id profilo non valido")
    with session_scope() as s:
        row = s.get(ProfileRow, profile_id)
        if row is None:
            raise HTTPException(404, "profilo non trovato")
        return _view(s, row, oggi())


@router.get("/collection")
def collection() -> list[CollectionItem]:
    """Tutte le carte collezionabili: i personaggi e le loro forme."""
    tutte = [*load_characters().values(), *load_forms().values()]
    return [
        CollectionItem(id=c.id, nome=c.nome, anime=c.anime, rating=c.rating, forma=c.forma)
        for c in tutte
    ]


@router.get("/season")
def season() -> SeasonView:
    stag = stagione_di(oggi())
    with session_scope() as s:
        rows = s.scalars(
            select(SeasonScore)
            .where(SeasonScore.season == stag)
            .order_by(SeasonScore.points.desc(), SeasonScore.id)
            .limit(TOP_STAGIONE)
        ).all()
        return SeasonView(season=stag, top=[SeasonRow(name=r.name, points=r.points) for r in rows])


def _new_id() -> str:
    import uuid

    return str(uuid.uuid4())
