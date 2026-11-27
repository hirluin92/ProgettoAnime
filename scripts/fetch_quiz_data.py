"""Scarica da AniList i dati per i giochi a quiz (Animedle, copertine, personaggi).

Si lancia a mano (non fa parte dell'app): `python scripts/fetch_quiz_data.py`.
Salva solo metadati testuali e gli URL delle immagini (collegate, mai copiate) in app/quiz/data/.
L'API AniList è gratuita per uso non commerciale: rispettiamo il limite di richieste.
"""

import json
import re
import sys
import time
import urllib.request
from pathlib import Path

URL = "https://graphql.anilist.co"
DATA = Path(__file__).resolve().parent.parent / "backend" / "app" / "quiz" / "data"
N_ANIME = 600
N_PERSONAGGI = 500

Q_ANIME = """
query ($page: Int) { Page(page: $page, perPage: 50) {
  pageInfo { hasNextPage }
  media(type: ANIME, sort: POPULARITY_DESC, format_in: [TV, MOVIE], isAdult: false) {
    id title { romaji english } synonyms seasonYear season format episodes source genres
    averageScore popularity nextAiringEpisode { episode } studios(isMain: true) { nodes { name } }
    coverImage { large } bannerImage
    relations { edges { relationType node { id type } } }
  } } }
"""
Q_PERS = """
query ($page: Int) { Page(page: $page, perPage: 50) {
  pageInfo { hasNextPage }
  characters(sort: FAVOURITES_DESC) {
    id name { full alternative } image { large } gender age favourites
    media(sort: POPULARITY_DESC, perPage: 1, type: ANIME) {
      edges { characterRole node { id title { romaji english } seasonYear genres } }
    }
  } } }
"""


def chiama(query: str, page: int) -> dict:
    corpo = json.dumps({"query": query, "variables": {"page": page}}).encode()
    req = urllib.request.Request(
        URL,
        corpo,
        {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "arena-anime-quiz-fetch/1.0",
        },
    )
    for tentativo in range(5):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.load(r)["data"]["Page"]
        except Exception as e:  # noqa: BLE001 - rete: si riprova con pausa
            print("  riprovo:", e, file=sys.stderr)
            time.sleep(8 * (tentativo + 1))
    raise SystemExit("AniList non risponde")


LATINO = re.compile(r"^[\x20-\x7eÀ-ſ]+$")


SERIE = {"PREQUEL", "SEQUEL", "PARENT", "SIDE_STORY"}  # relazioni che tengono unita una serie


def assegna_serie(out: list[dict], legami: list[tuple[int, int]]) -> None:
    """Raggruppa le stagioni della stessa serie (anche passando per anime fuori dall'elenco)."""
    padre: dict[int, int] = {}

    def trova(x: int) -> int:
        padre.setdefault(x, x)
        while padre[x] != x:
            padre[x] = padre[padre[x]]
            x = padre[x]
        return x

    for a, b in legami:
        ra, rb = trova(a), trova(b)
        if ra != rb:
            padre[max(ra, rb)] = min(ra, rb)
    for a in out:
        a["serie"] = trova(a["id"])


def anime() -> list[dict]:
    out: list[dict] = []
    legami: list[tuple[int, int]] = []
    pagina = 1
    while len(out) < N_ANIME:
        p = chiama(Q_ANIME, pagina)
        for m in p["media"]:
            if not m.get("seasonYear") or not m.get("format"):
                continue
            for e in (m.get("relations") or {}).get("edges") or []:
                if e["relationType"] in SERIE and e["node"]["type"] == "ANIME":
                    legami.append((m["id"], e["node"]["id"]))
            titoli = [t for t in (m["title"]["romaji"], m["title"]["english"]) if t]
            if not titoli:
                continue
            out.append(
                {
                    "id": m["id"],
                    "titolo": titoli[0],
                    "titolo_en": m["title"]["english"] or "",
                    "sinonimi": [s for s in m.get("synonyms") or [] if LATINO.match(s)][:6],
                    "anno": m["seasonYear"],
                    "stagione": m.get("season") or "",
                    "formato": m["format"],
                    "episodi": m.get("episodes")
                    or max(1, ((m.get("nextAiringEpisode") or {}).get("episode") or 2) - 1),
                    "fonte": m.get("source") or "",
                    "generi": m.get("genres") or [],
                    "studio": [n["name"] for n in m["studios"]["nodes"]][:2],
                    "voto": m.get("averageScore") or 0,
                    "cover": m["coverImage"]["large"],
                    "banner": m.get("bannerImage") or "",
                }
            )
        print(f"anime {len(out)}")
        if not p["pageInfo"]["hasNextPage"]:
            break
        pagina += 1
        time.sleep(1.2)
    out = out[:N_ANIME]
    assegna_serie(out, legami)
    return out


def personaggi() -> list[dict]:
    out: list[dict] = []
    pagina = 1
    while len(out) < N_PERSONAGGI:
        p = chiama(Q_PERS, pagina)
        for c in p["characters"]:
            edges = c["media"]["edges"]
            if not edges or not c["image"]["large"] or "default" in c["image"]["large"]:
                continue
            e = edges[0]
            out.append(
                {
                    "id": c["id"],
                    "nome": c["name"]["full"],
                    "alt": [a for a in c["name"]["alternative"] or [] if LATINO.match(a)][:4],
                    "img": c["image"]["large"],
                    "genere": c.get("gender") or "",
                    "eta": c.get("age") or "",
                    "fav": c["favourites"],
                    "ruolo": e["characterRole"],
                    "anime_id": e["node"]["id"],
                    "anime": e["node"]["title"]["romaji"] or e["node"]["title"]["english"],
                    "anno": e["node"].get("seasonYear") or 0,
                    "generi": e["node"].get("genres") or [],
                }
            )
        print(f"personaggi {len(out)}")
        if not p["pageInfo"]["hasNextPage"]:
            break
        pagina += 1
        time.sleep(1.2)
    return out[:N_PERSONAGGI]


if __name__ == "__main__":
    DATA.mkdir(parents=True, exist_ok=True)
    scelte = sys.argv[1:] or ["anime", "personaggi"]
    if "anime" in scelte:
        (DATA / "anime.json").write_text(
            json.dumps(anime(), ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
    if "personaggi" in scelte:
        (DATA / "personaggi.json").write_text(
            json.dumps(personaggi(), ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
