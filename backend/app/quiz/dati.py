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


@lru_cache
def artisti() -> list[str]:
    """Gli artisti delle sigle (nome in caratteri latini), senza doppioni; l'indice è il loro id."""
    visti: dict[str, str] = {}
    for x in json.loads((DATA / "sigle.json").read_text(encoding="utf-8")):
        visti.setdefault(normalizza(x["artista_lat"]), x["artista_lat"])
    return sorted(visti.values(), key=normalizza)


@lru_cache
def sigle() -> list[dict[str, Any]]:
    """Le sigle con il loro anime: dati dell'anime, più brano, artista e anteprima audio.

    `brano_idx` (posizione nell'elenco) e `artista_idx` (posizione in `artisti()`) servono per
    riconoscere la risposta «titolo del brano» e «artista» nel quiz.
    """
    per_id = anime_per_id()
    indice = {normalizza(a): i for i, a in enumerate(artisti())}
    grezze = json.loads((DATA / "sigle.json").read_text(encoding="utf-8"))
    out: list[dict[str, Any]] = []
    for x in grezze:
        if x["anime_id"] not in per_id:
            continue
        out.append(
            {
                **per_id[x["anime_id"]],
                **x,
                "brano_idx": len(out),
                "artista_idx": indice[normalizza(x["artista_lat"])],
            }
        )
    return out


def pool_anime() -> list[dict[str, Any]]:
    return anime()[:POOL_ANIME]


def pool_personaggi() -> list[dict[str, Any]]:
    return personaggi()[:300]


def normalizza(s: str) -> str:
    """Minuscolo, senza accenti né punteggiatura: per confrontare risposte scritte a mano."""
    # Come fa il frontend (lib/quiz.ts): si tolgono gli accenti e tutto il resto, apostrofo
    # tipografico compreso, diventa uno spazio. Prima l'apostrofo ’ spariva senza lasciare lo
    # spazio («journey’s» → «journeys») e chi scriveva il titolo intero non trovava l'anime.
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def titoli_anime(a: dict[str, Any]) -> list[str]:
    return [t for t in [a["titolo"], a["titolo_en"], *a["sinonimi"]] if t]


def risposta_giusta_anime(a: dict[str, Any], testo: str) -> bool:
    n = normalizza(testo)
    return bool(n) and any(normalizza(t) == n for t in titoli_anime(a))


def stessa_serie(a: dict[str, Any], b: dict[str, Any]) -> bool:
    """Due anime diversi che sono stagioni o film della stessa serie (es. Re:Zero 1 e 2)."""
    return a["id"] != b["id"] and a.get("serie") is not None and a.get("serie") == b.get("serie")
