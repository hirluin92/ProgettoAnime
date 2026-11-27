"""Animedle: si indovina un anime dai suoi attributi, come Pokedle. Funzioni pure."""

import hashlib
from typing import Any

from app.quiz.dati import pool_anime

TENTATIVI_MAX = 8
CREDITI_BASE = 45
CREDITI_PER_TENTATIVO = 5
CREDITI_MIN = 10
BONUS_SERIE = 5  # per ogni giorno di serie, fino a +25
BONUS_SERIE_MAX = 25


def indice_giorno(gioco: str, day: str, n: int) -> int:
    h = hashlib.sha256(f"{gioco}:{day}".encode()).digest()
    return int.from_bytes(h[:8], "big") % n


def bersaglio_giorno(day: str) -> dict[str, Any]:
    pool = pool_anime()
    return pool[indice_giorno("animedle", day, len(pool))]


def crediti_vittoria(tentativi: int, serie: int) -> int:
    base = max(CREDITI_MIN, CREDITI_BASE - CREDITI_PER_TENTATIVO * (tentativi - 1))
    return base + min(BONUS_SERIE_MAX, BONUS_SERIE * max(0, serie - 1))


def _numero(g: int, t: int, vicino: int) -> dict[str, Any]:
    """Confronto numerico: `piu` = il bersaglio ha un valore più alto di quello provato."""
    if g == t:
        esito = "uguale"
    else:
        esito = "piu" if t > g else "meno"
    return {"valore": g, "esito": esito, "vicino": g != t and abs(g - t) <= vicino}


def _insieme(g: list[str], t: list[str]) -> dict[str, Any]:
    sg, st = set(g), set(t)
    if sg == st:
        esito = "uguale"
    elif sg & st:
        esito = "parziale"
    else:
        esito = "diverso"
    return {"valori": g, "esito": esito, "giusti": sorted(sg & st)}


def _testo(g: str, t: str) -> dict[str, Any]:
    return {"valore": g, "esito": "uguale" if g == t else "diverso"}


def feedback(g: dict[str, Any], t: dict[str, Any]) -> dict[str, Any]:
    """Come si avvicina l'anime provato `g` al bersaglio `t`, attributo per attributo."""
    return {
        "anno": _numero(g["anno"], t["anno"], 2),
        "episodi": _numero(g["episodi"], t["episodi"], max(2, round(t["episodi"] * 0.2))),
        "voto": _numero(g["voto"], t["voto"], 3),
        "studio": _insieme(g["studio"], t["studio"]),
        "generi": _insieme(g["generi"], t["generi"]),
        "formato": _testo(g["formato"], t["formato"]),
        "fonte": _testo(g["fonte"], t["fonte"]),
        "stagione": _testo(g["stagione"], t["stagione"]),
    }


# Indizi extra: dopo quanti errori si sbloccano.
SOGLIA_INIZIALE = 3
SOGLIA_COPERTINA = 5
SOGLIA_PAROLE = 6


def indizi(t: dict[str, Any], errori: int) -> list[dict[str, str]]:
    """Indizi che si sbloccano con gli errori: iniziale, copertina sfocata, numero di parole."""
    titolo = str(t["titolo_en"] or t["titolo"])
    scala = [
        (SOGLIA_INIZIALE, "iniziale", titolo[:1].upper()),
        (SOGLIA_COPERTINA, "copertina", str(t["cover"])),
        (SOGLIA_PAROLE, "parole", str(len(titolo.split()))),
    ]
    return [{"k": k, "v": v} for n, k, v in scala if errori >= n]
