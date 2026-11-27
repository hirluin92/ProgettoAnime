"""Pacchetti di carte: si comprano con i crediti guadagnati giocando (mai con denaro).

Le probabilità sono pubbliche (`GET /api/pacchetti`) e valgono per ogni carta del pacchetto.
Ogni pacchetto ha una rarità garantita; una leggendaria è garantita ogni PITY_MAX pacchetti senza.
Le carte già possedute (o uscite due volte nello stesso pacchetto) diventano crediti.
"""

import random
from dataclasses import dataclass

from fastapi import APIRouter, HTTPException
from pydantic import Field

from app.album import rarita
from app.db.models import ProfileRow
from app.db.session import session_scope
from app.duello.carte import Carta
from app.duello_api import CartaView, _tutte, vista_carta
from app.engine.models import Model
from app.profilo import UUID_RE

router = APIRouter(prefix="/api/pacchetti")

RARITA = ("comune", "rara", "epica", "leggendaria")
PITY_MAX = 30  # al 30° pacchetto senza leggendaria, ne esce una
RIMBORSO = {"comune": 10, "rara": 25, "epica": 60, "leggendaria": 150}  # doppioni → crediti


@dataclass(frozen=True)
class Tipo:
    id: str
    nome: str
    prezzo: int
    carte: int
    garantita: str | None  # rarità minima garantita (almeno una carta)
    pesi: tuple[int, int, int, int]  # % per comune, rara, epica, leggendaria


TIPI: dict[str, Tipo] = {
    t.id: t
    for t in (
        Tipo("base", "Pacchetto Base", 100, 3, None, (70, 22, 7, 1)),
        Tipo("argento", "Pacchetto Argento", 250, 4, "rara", (50, 35, 12, 3)),
        Tipo("oro", "Pacchetto Oro", 600, 5, "epica", (30, 38, 25, 7)),
        Tipo("leggendario", "Pacchetto Leggendario", 1500, 5, "leggendaria", (15, 30, 35, 20)),
    )
}


def _per_rarita() -> dict[str, list[Carta]]:
    out: dict[str, list[Carta]] = {r: [] for r in RARITA}
    for c, _ in _tutte().values():
        out[rarita(c.rating)].append(c)
    for v in out.values():
        v.sort(key=lambda c: c.id)
    return out


def estrai(tipo: Tipo, pity: int, rng: random.Random) -> tuple[list[Carta], bool]:
    """Le carte di un pacchetto e se ha contenuto la leggendaria di garanzia (pity)."""
    pool = _per_rarita()
    carte: list[Carta] = []
    for _ in range(tipo.carte):
        r = rng.choices(RARITA, weights=tipo.pesi)[0]
        carte.append(rng.choice(pool[r]))
    ordine = {r: i for i, r in enumerate(RARITA)}
    # rarità garantita: se nessuna carta la raggiunge, l'ultima viene sostituita
    if tipo.garantita and all(ordine[rarita(c.rating)] < ordine[tipo.garantita] for c in carte):
        carte[-1] = rng.choice(pool[tipo.garantita])
    garantita_pity = False
    if pity + 1 >= PITY_MAX and not any(rarita(c.rating) == "leggendaria" for c in carte):
        carte[-1] = rng.choice(pool["leggendaria"])
        garantita_pity = True
    return carte, garantita_pity


# ---------- modelli ----------
class TipoView(Model):
    id: str
    nome: str
    prezzo: int
    carte: int
    garantita: str | None
    probabilita: dict[str, float]  # % per carta
    carte_per_rarita: dict[str, int]


class NegozioOut(Model):
    tipi: list[TipoView]
    pity_max: int
    rimborso: dict[str, int]


class CartaEstratta(Model):
    carta: CartaView
    rarita: str
    nuova: bool
    rimborso: int  # crediti restituiti se era un doppione


class AperturaOut(Model):
    tipo: str
    carte: list[CartaEstratta]
    spesi: int
    rimborsati: int
    crediti: int  # saldo dopo l'apertura
    pity: int  # pacchetti dall'ultima leggendaria
    garanzia_pity: bool


class ApriIn(Model):
    tipo: str = Field(min_length=1, max_length=20)


@router.get("")
def negozio() -> NegozioOut:
    pool = _per_rarita()
    return NegozioOut(
        tipi=[
            TipoView(
                id=t.id,
                nome=t.nome,
                prezzo=t.prezzo,
                carte=t.carte,
                garantita=t.garantita,
                probabilita=dict(zip(RARITA, map(float, t.pesi), strict=True)),
                carte_per_rarita={r: len(pool[r]) for r in RARITA},
            )
            for t in TIPI.values()
        ],
        pity_max=PITY_MAX,
        rimborso=RIMBORSO,
    )


def apri_pacchetto(profile_id: str, tipo_id: str, rng: random.Random | None = None) -> AperturaOut:
    if not UUID_RE.match(profile_id):
        raise HTTPException(422, "id profilo non valido")
    tipo = TIPI.get(tipo_id)
    if tipo is None:
        raise HTTPException(404, "pacchetto sconosciuto")
    rng = rng or random.SystemRandom()
    with session_scope() as s:
        row = s.get(ProfileRow, profile_id, with_for_update=True)
        if row is None:
            raise HTTPException(404, "profilo non trovato")
        if row.crediti < tipo.prezzo:
            raise HTTPException(402, f"servono {tipo.prezzo} crediti (ne hai {row.crediti})")
        carte, garanzia = estrai(tipo, row.pity, rng)
        possedute = set(row.collezione or [])
        viste: set[str] = set()
        out: list[CartaEstratta] = []
        rimborsati = 0
        for c in carte:
            r = rarita(c.rating)
            nuova = c.id not in possedute and c.id not in viste
            rimb = 0 if nuova else RIMBORSO[r]
            rimborsati += rimb
            viste.add(c.id)
            out.append(CartaEstratta(carta=vista_carta(c), rarita=r, nuova=nuova, rimborso=rimb))
        row.collezione = sorted(possedute | viste)
        row.crediti = row.crediti - tipo.prezzo + rimborsati
        row.pacchetti_aperti += 1
        row.pity = 0 if any(x.rarita == "leggendaria" for x in out) else row.pity + 1
        return AperturaOut(
            tipo=tipo.id,
            carte=out,
            spesi=tipo.prezzo,
            rimborsati=rimborsati,
            crediti=row.crediti,
            pity=row.pity,
            garanzia_pity=garanzia,
        )


@router.post("/{profile_id}/apri")
def apri(profile_id: str, body: ApriIn) -> AperturaOut:
    return apri_pacchetto(profile_id, body.tipo)
