"""API dei giochi a quiz: Animedle del giorno e in allenamento.

Il server custodisce il bersaglio: al client arriva solo l'esito del confronto (gli indizi), e il
bersaglio vero soltanto a partita finita. I crediti si ottengono solo vincendo la sfida del giorno.
"""

import hashlib
import hmac
import os
import random
import secrets
from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import Field
from sqlalchemy import select

from app.db.models import ProfileRow, QuizGiorno
from app.db.session import session_scope
from app.engine.models import Model
from app.profilo import UUID_RE, oggi
from app.quiz import animedle
from app.quiz.dati import anime, anime_per_id, normalizza, pool_anime

router = APIRouter(prefix="/api/quiz")

_SEGRETO = (os.environ.get("QUIZ_SECRET") or secrets.token_hex(16)).encode()


def firma(gioco: str, valore: int) -> str:
    sig = hmac.new(_SEGRETO, f"{gioco}:{valore}".encode(), hashlib.sha256).hexdigest()[:16]
    return f"{valore}.{sig}"


def leggi_firma(gioco: str, token: str) -> int | None:
    try:
        valore, _ = token.split(".", 1)
        n = int(valore)
    except ValueError:
        return None
    return n if hmac.compare_digest(firma(gioco, n), token) else None


class VoceAnime(Model):
    id: int
    nome: str  # titolo mostrato (inglese se c'è)
    alt: str  # titolo originale (romaji) se diverso
    k: str  # chiavi di ricerca normalizzate (tutti i titoli)
    anno: int


class SoluzioneAnime(Model):
    id: int
    titolo: str
    titolo_en: str
    anno: int
    cover: str


class AnimedleStato(Model):
    giorno: str
    tentativi_max: int
    tentativi_fatti: int
    finito: bool
    vinto: bool
    serie: int
    crediti: int
    bersaglio: SoluzioneAnime | None = None


class AnimedleGuess(Model):
    anime_id: int
    profile_id: str | None = None
    token: str | None = None  # allenamento: bersaglio firmato
    n: int = Field(default=1, ge=1, le=50)  # tentativo numero (solo senza profilo)


class AnimedleEsito(Model):
    feedback: dict[str, Any]
    giusto: bool
    tentativo: int
    finito: bool
    crediti: int
    bersaglio: SoluzioneAnime | None = None


class Nuovo(Model):
    token: str
    tentativi_max: int


def soluzione(a: dict[str, Any]) -> SoluzioneAnime:
    return SoluzioneAnime(
        id=a["id"], titolo=a["titolo"], titolo_en=a["titolo_en"], anno=a["anno"], cover=a["cover"]
    )


def _profilo_ok(profile_id: str | None) -> str | None:
    if profile_id is None:
        return None
    if not UUID_RE.match(profile_id):
        raise HTTPException(422, "id profilo non valido")
    return profile_id


def serie_prima(s, profile_id: str, gioco: str, day: str) -> int:  # type: ignore[no-untyped-def]
    """Giorni consecutivi vinti fino a ieri."""
    giorni = {
        r
        for r in s.scalars(
            select(QuizGiorno.day).where(
                QuizGiorno.profile_id == profile_id,
                QuizGiorno.gioco == gioco,
                QuizGiorno.vinto.is_(True),
            )
        )
    }
    d = date.fromisoformat(day) - timedelta(days=1)
    n = 0
    while d.isoformat() in giorni:
        n += 1
        d -= timedelta(days=1)
    return n


@router.get("/anime/elenco")
def elenco_anime() -> list[VoceAnime]:
    out = []
    for a in anime():
        chiavi = " | ".join(
            dict.fromkeys(normalizza(t) for t in [a["titolo"], a["titolo_en"], *a["sinonimi"]] if t)
        )
        out.append(
            VoceAnime(
                id=a["id"],
                nome=a["titolo_en"] or a["titolo"],
                alt=a["titolo"] if a["titolo_en"] and a["titolo_en"] != a["titolo"] else "",
                k=chiavi,
                anno=a["anno"],
            )
        )
    return out


@router.get("/animedle/stato")
def animedle_stato(profile_id: str | None = None) -> AnimedleStato:
    day = oggi()
    pid = _profilo_ok(profile_id)
    stato = AnimedleStato(
        giorno=day,
        tentativi_max=animedle.TENTATIVI_MAX,
        tentativi_fatti=0,
        finito=False,
        vinto=False,
        serie=0,
        crediti=0,
    )
    if pid is None:
        return stato
    with session_scope() as s:
        riga = s.scalar(
            select(QuizGiorno).where(
                QuizGiorno.profile_id == pid,
                QuizGiorno.gioco == "animedle",
                QuizGiorno.day == day,
            )
        )
        prima = serie_prima(s, pid, "animedle", day)
        if riga is None:
            stato.serie = prima
            return stato
        stato.tentativi_fatti = riga.tentativi
        stato.vinto = riga.vinto
        stato.finito = riga.vinto or riga.tentativi >= animedle.TENTATIVI_MAX
        stato.crediti = riga.crediti
        stato.serie = prima + 1 if riga.vinto else prima
        if stato.finito:
            stato.bersaglio = soluzione(animedle.bersaglio_giorno(day))
    return stato


@router.post("/animedle/nuovo")
def animedle_nuovo() -> Nuovo:
    a = random.choice(pool_anime())
    return Nuovo(token=firma("animedle", a["id"]), tentativi_max=animedle.TENTATIVI_MAX)


def _riga_oggi(s, pid: str, day: str) -> QuizGiorno:  # type: ignore[no-untyped-def]
    riga = s.scalar(
        select(QuizGiorno).where(
            QuizGiorno.profile_id == pid, QuizGiorno.gioco == "animedle", QuizGiorno.day == day
        )
    )
    if riga is None:
        if s.get(ProfileRow, pid) is None:
            raise HTTPException(404, "profilo non trovato")
        riga = QuizGiorno(
            profile_id=pid, gioco="animedle", day=day, tentativi=0, vinto=False, crediti=0
        )
        s.add(riga)
        s.flush()
    return riga  # type: ignore[no-any-return]


@router.post("/animedle/guess")
def animedle_guess(body: AnimedleGuess) -> AnimedleEsito:
    g = anime_per_id().get(body.anime_id)
    if g is None:
        raise HTTPException(404, "anime sconosciuto")
    pid = _profilo_ok(body.profile_id)
    massimo = animedle.TENTATIVI_MAX

    if body.token is not None:  # allenamento
        bid = leggi_firma("animedle", body.token)
        if bid is None or bid not in anime_per_id():
            raise HTTPException(422, "partita non valida")
        t = anime_per_id()[bid]
        giusto = g["id"] == t["id"]
        finito = giusto or body.n >= massimo
        return AnimedleEsito(
            feedback=animedle.feedback(g, t),
            giusto=giusto,
            tentativo=body.n,
            finito=finito,
            crediti=0,
            bersaglio=soluzione(t) if finito else None,
        )

    day = oggi()
    t = animedle.bersaglio_giorno(day)
    giusto = g["id"] == t["id"]
    fb = animedle.feedback(g, t)
    if pid is None:  # senza profilo si gioca, ma niente crediti e il limite lo tiene il browser
        finito = giusto or body.n >= massimo
        return AnimedleEsito(
            feedback=fb,
            giusto=giusto,
            tentativo=body.n,
            finito=finito,
            crediti=0,
            bersaglio=soluzione(t) if finito else None,
        )

    with session_scope() as s:
        riga = _riga_oggi(s, pid, day)
        if riga.vinto or riga.tentativi >= massimo:
            raise HTTPException(409, "la sfida di oggi è già finita")
        riga.tentativi += 1
        crediti = 0
        if giusto:
            riga.vinto = True
            crediti = animedle.crediti_vittoria(
                riga.tentativi, serie_prima(s, pid, "animedle", day) + 1
            )
            riga.crediti = crediti
            profilo = s.get(ProfileRow, pid)
            assert profilo is not None
            profilo.crediti += crediti
        finito = giusto or riga.tentativi >= massimo
        return AnimedleEsito(
            feedback=fb,
            giusto=giusto,
            tentativo=riga.tentativi,
            finito=finito,
            crediti=crediti,
            bersaglio=soluzione(t) if finito else None,
        )


class Arrenditi(Model):
    profile_id: str | None = None
    token: str | None = None


@router.post("/animedle/arrenditi")
def animedle_arrenditi(body: Arrenditi) -> SoluzioneAnime:
    if body.token is not None:
        bid = leggi_firma("animedle", body.token)
        if bid is None or bid not in anime_per_id():
            raise HTTPException(422, "partita non valida")
        return soluzione(anime_per_id()[bid])
    day = oggi()
    pid = _profilo_ok(body.profile_id)
    if pid is not None:
        with session_scope() as s:
            riga = _riga_oggi(s, pid, day)
            if not riga.vinto:
                riga.tentativi = animedle.TENTATIVI_MAX
    return soluzione(animedle.bersaglio_giorno(day))
