"""Giochi a immagine: scorcio (banner di un anime) e personaggio misterioso.

L'immagine si scopre a poco a poco a ogni errore. Funzioni pure: scelta del bersaglio per data,
punto da inquadrare, indizi sbloccati. L'immagine è sempre collegata da AniList, mai copiata.
"""

import hashlib
from typing import Any

from app.quiz.animedle import BONUS_SERIE, BONUS_SERIE_MAX, indice_giorno
from app.quiz.dati import anime_per_id, personaggi_per_id, pool_anime, pool_personaggi

TENTATIVI_MAX = 6
CREDITI_BASE = 40
CREDITI_PER_TENTATIVO = 6
CREDITI_MIN = 10
GIOCHI = ("scorcio", "personaggio")


def crediti_vittoria(tentativi: int, serie: int) -> int:
    base = max(CREDITI_MIN, CREDITI_BASE - CREDITI_PER_TENTATIVO * (tentativi - 1))
    return base + min(BONUS_SERIE_MAX, BONUS_SERIE * max(0, serie - 1))


def pool(gioco: str) -> list[dict[str, Any]]:
    return [a for a in pool_anime() if a["banner"]] if gioco == "scorcio" else pool_personaggi()


def bersaglio_giorno(gioco: str, day: str) -> dict[str, Any]:
    p = pool(gioco)
    return p[indice_giorno(gioco, day, len(p))]


def immagine(gioco: str, t: dict[str, Any]) -> str:
    return str(t["banner"] if gioco == "scorcio" else t["img"])


def punto(gioco: str, t: dict[str, Any]) -> tuple[float, float]:
    """Dove si inquadra l'immagine all'inizio (percentuali), fisso per ogni bersaglio."""
    h = hashlib.sha256(f"punto:{gioco}:{t['id']}".encode()).digest()
    x = 20 + (h[0] / 255) * 60
    # i volti sono nella parte alta dei ritratti, gli scorci hanno interesse al centro
    y = 8 + (h[1] / 255) * 22 if gioco == "personaggio" else 25 + (h[1] / 255) * 50
    return round(x, 1), round(y, 1)


def indizi(gioco: str, t: dict[str, Any], errori: int) -> list[dict[str, str]]:
    """Indizi sbloccati dopo `errori` risposte sbagliate: ogni voce è {k: tipo, v: valore}."""
    if gioco == "scorcio":
        scala = [
            (2, "anno", str(t["anno"])),
            (3, "fonte", str(t["fonte"])),
            (4, "studio", ", ".join(t["studio"])),
            (5, "generi", ", ".join(t["generi"])),
        ]
    else:
        scala = [
            (2, "ruolo", str(t["ruolo"])),
            (3, "genere", str(t["genere"])),
            (4, "anno", str(t["anno"])),
            (5, "iniziale", str(t["anime"])[:1].upper()),
        ]
    return [{"k": k, "v": v} for n, k, v in scala if errori >= n and v]


def nome_bersaglio(gioco: str, t: dict[str, Any]) -> str:
    return str(t["titolo_en"] or t["titolo"]) if gioco == "scorcio" else str(t["nome"])


def risposta_per_id(gioco: str, valore: int) -> dict[str, Any] | None:
    return (anime_per_id() if gioco == "scorcio" else personaggi_per_id()).get(valore)
