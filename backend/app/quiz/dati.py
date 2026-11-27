"""Dati dei giochi a quiz: anime e personaggi da AniList (vedi scripts/fetch_quiz_data.py).

Solo metadati testuali e URL di immagini collegate: nessuna immagine è copiata o ospitata.
"""

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA = Path(__file__).parent / "data"
POOL_ANIME = 300  # i più popolari: i bersagli dei giochi sono sempre anime conosciuti


@lru_cache
def anime() -> list[dict[str, Any]]:
    return json.loads((DATA / "anime.json").read_text(encoding="utf-8"))  # type: ignore[no-any-return]


@lru_cache
def anime_per_id() -> dict[int, dict[str, Any]]:
    return {a["id"]: a for a in anime()}


@lru_cache
def personaggi() -> list[dict[str, Any]]:
    return json.loads((DATA / "personaggi.json").read_text(encoding="utf-8"))  # type: ignore[no-any-return]


@lru_cache
def personaggi_per_id() -> dict[int, dict[str, Any]]:
    return {p["id"]: p for p in personaggi()}


def pool_anime() -> list[dict[str, Any]]:
    return anime()[:POOL_ANIME]


def pool_personaggi() -> list[dict[str, Any]]:
    return personaggi()[:300]


def normalizza(s: str) -> str:
    """Minuscolo, senza accenti né punteggiatura: per confrontare risposte scritte a mano."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def titoli_anime(a: dict[str, Any]) -> list[str]:
    return [t for t in [a["titolo"], a["titolo_en"], *a["sinonimi"]] if t]


def risposta_giusta_anime(a: dict[str, Any], testo: str) -> bool:
    n = normalizza(testo)
    return bool(n) and any(normalizza(t) == n for t in titoli_anime(a))
