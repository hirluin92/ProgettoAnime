"""Registrazione e accesso: nome utente + password, con un codice di recupero.

Il profilo anonimo di un dispositivo (id casuale) diventa un account quando gli si associano un
nome utente e una password: da quel momento si può riaccedere da un altro dispositivo. Nessun
servizio esterno: le password stanno nel database solo come hash scrypt con sale. Google e il
link via email si potranno aggiungere in seguito sopra lo stesso profilo.
"""

import hashlib
import hmac
import re
import secrets
import time

from fastapi import APIRouter, HTTPException, Request
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.models import ProfileRow
from app.db.session import session_scope
from app.engine.models import Model
from app.profilo import UUID_RE, ProfileView, _view, oggi

router = APIRouter(prefix="/api/account")

USER_RE = re.compile(r"^[a-z0-9_]{3,20}$")
MIN_PASSWORD = 8
TENTATIVI = 5  # errori consentiti per finestra
FINESTRA = 600.0  # secondi
_falliti: dict[str, list[float]] = {}


# ---------- hash ----------
def hash_segreto(segreto: str) -> str:
    sale = secrets.token_bytes(16)
    h = hashlib.scrypt(segreto.encode(), salt=sale, n=2**14, r=8, p=1, dklen=32)
    return f"scrypt${sale.hex()}${h.hex()}"


def verifica_segreto(segreto: str, salvato: str | None) -> bool:
    if not salvato:
        hashlib.scrypt(b"x", salt=b"0" * 16, n=2**14, r=8, p=1, dklen=32)  # tempo costante
        return False
    try:
        _, sale, h = salvato.split("$")
        calc = hashlib.scrypt(
            segreto.encode(), salt=bytes.fromhex(sale), n=2**14, r=8, p=1, dklen=32
        )
        return hmac.compare_digest(calc.hex(), h)
    except ValueError:
        return False


def nuovo_codice_recupero() -> str:
    raw = secrets.token_hex(8).upper()
    return "-".join(raw[i : i + 4] for i in range(0, 16, 4))


def _normalizza_codice(c: str) -> str:
    return re.sub(r"[^0-9A-F]", "", c.upper())


# ---------- limite di tentativi ----------
def _chiave(request: Request, nome: str) -> str:
    ip = request.client.host if request.client else "?"
    return f"{ip}|{nome.lower()}"


def _blocca_se_troppi(chiave: str) -> None:
    ora = time.time()
    lista = [t for t in _falliti.get(chiave, []) if ora - t < FINESTRA]
    _falliti[chiave] = lista
    if len(lista) >= TENTATIVI:
        raise HTTPException(429, "troppi tentativi: riprova tra qualche minuto")


def _registra_fallimento(chiave: str) -> None:
    _falliti.setdefault(chiave, []).append(time.time())


# ---------- modelli ----------
class RegistraIn(Model):
    profile_id: str
    username: str = Field(min_length=3, max_length=20)
    password: str = Field(min_length=MIN_PASSWORD, max_length=128)


class AccediIn(Model):
    username: str = Field(min_length=1, max_length=20)
    password: str = Field(min_length=1, max_length=128)


class RecuperaIn(Model):
    username: str = Field(min_length=1, max_length=20)
    codice: str = Field(min_length=1, max_length=40)
    nuova_password: str = Field(min_length=MIN_PASSWORD, max_length=128)


class AccountOut(Model):
    profile: ProfileView
    codice_recupero: str | None = None  # mostrato una sola volta


# ---------- API ----------
@router.post("/registra")
def registra(body: RegistraIn) -> AccountOut:
    nome = body.username.strip().lower()
    if not USER_RE.match(nome):
        raise HTTPException(422, "nome utente: 3-20 caratteri tra lettere, numeri e _")
    if not UUID_RE.match(body.profile_id):
        raise HTTPException(422, "id profilo non valido")
    codice = nuovo_codice_recupero()
    with session_scope() as s:
        row = s.get(ProfileRow, body.profile_id)
        if row is None:
            raise HTTPException(404, "profilo non trovato")
        if row.username:
            raise HTTPException(409, "questo profilo ha già un account")
        if s.scalar(select(ProfileRow).where(ProfileRow.username == nome)):
            raise HTTPException(409, "nome utente già preso")
        row.username = nome
        row.pw_hash = hash_segreto(body.password)
        row.recovery_hash = hash_segreto(_normalizza_codice(codice))
        try:
            s.flush()
        except IntegrityError as e:
            raise HTTPException(409, "nome utente già preso") from e
        return AccountOut(profile=_view(s, row, oggi()), codice_recupero=codice)


@router.post("/accedi")
def accedi(body: AccediIn, request: Request) -> AccountOut:
    nome = body.username.strip().lower()
    chiave = _chiave(request, nome)
    _blocca_se_troppi(chiave)
    with session_scope() as s:
        row = s.scalar(select(ProfileRow).where(ProfileRow.username == nome))
        if not verifica_segreto(body.password, row.pw_hash if row else None) or row is None:
            _registra_fallimento(chiave)
            raise HTTPException(401, "nome utente o password errati")
        _falliti.pop(chiave, None)
        return AccountOut(profile=_view(s, row, oggi()))


@router.post("/recupera")
def recupera(body: RecuperaIn, request: Request) -> AccountOut:
    nome = body.username.strip().lower()
    chiave = _chiave(request, nome)
    _blocca_se_troppi(chiave)
    with session_scope() as s:
        row = s.scalar(select(ProfileRow).where(ProfileRow.username == nome))
        ok = verifica_segreto(_normalizza_codice(body.codice), row.recovery_hash if row else None)
        if not ok or row is None:
            _registra_fallimento(chiave)
            raise HTTPException(401, "nome utente o codice errati")
        _falliti.pop(chiave, None)
        nuovo = nuovo_codice_recupero()
        row.pw_hash = hash_segreto(body.nuova_password)
        row.recovery_hash = hash_segreto(_normalizza_codice(nuovo))
        s.flush()
        return AccountOut(profile=_view(s, row, oggi()), codice_recupero=nuovo)
