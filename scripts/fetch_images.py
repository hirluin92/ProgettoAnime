"""Collega ogni personaggio all'immagine pubblicata da AniList (link, non copie).

Uso: python scripts/fetch_images.py

- Una sola ricerca per personaggio (~100 richieste), con pausa tra le richieste.
- Si accetta solo un risultato che compare nell'anime atteso; gli altri restano senza immagine.
- Scrive `immagine_url` in backend/data/characters.json e un rapporto in scripts/fetch_images_report.txt.
Condizioni dell'API: https://docs.anilist.co/guide/terms-of-use (uso non commerciale, credito obbligatorio).
"""

import json
import time
import urllib.error
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "backend" / "data" / "characters.json"
REPORT = Path(__file__).resolve().parent / "fetch_images_report.txt"
UA = "ArenaAnime-fan-project/0.1 (non-commercial; character image lookup)"
ANIME_KEYS = {
    "naruto": ["naruto"],
    "one-piece": ["one piece"],
    "dragon-ball": ["dragon ball"],
    "demon-slayer": ["kimetsu", "demon slayer"],
    "jujutsu-kaisen": ["jujutsu"],
}
# Nomi alternativi quando la trascrizione di AniList è diversa dalla nostra.
ALT = {
    "gyomei-himejima": ["Gyoumei Himejima"],
    "ryomen-sukuna": ["Sukuna"],
    "obito-uchiha": ["Obito"],
    "barbabianca": ["Edward Newgate"],
    "numero-18": ["Android 18"],
    "gotenks": ["Gotenks"],
    "kyojuro-rengoku": ["Kyoujurou Rengoku"],
    "shoko-ieiri": ["Shouko Ieiri"],
    "yuji-itadori": ["Yuuji Itadori"],
}


def norm(t: str) -> str:
    return t.lower().replace(".", "").replace("uu", "u").replace("ou", "o").replace("oo", "o")


def same_person(expected: str, found: dict, extra: list[str]) -> bool:
    """Il primo nome atteso deve comparire tra i nomi del risultato (trascrizioni diverse incluse)."""
    names = [found["name"]["full"], *(found["name"].get("alternative") or [])]
    tokens = {norm(w) for n in names for w in n.split()}
    wanted = [norm(expected.split()[0])] + [norm(w) for e in extra for w in e.split()[:1]]
    return any(w in tokens for w in wanted)


QUERY = """query($s:String){Page(perPage:8){characters(search:$s){
  id name{full alternative} image{large}
  media(perPage:25){nodes{title{romaji english}}}}}}"""


def search(name: str) -> list[dict]:
    for attempt in range(6):
        try:
            return _search(name)
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            wait = int(e.headers.get("Retry-After", "30")) + 2
            print(f"  limite richieste, attendo {wait}s")
            time.sleep(wait)
    raise RuntimeError("troppi tentativi")


def _search(name: str) -> list[dict]:
    body = json.dumps({"query": QUERY, "variables": {"s": name}}).encode()
    req = urllib.request.Request(
        "https://graphql.anilist.co",
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json", "User-Agent": UA},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["data"]["Page"]["characters"]


def in_anime(c: dict, anime: str) -> bool:
    keys = ANIME_KEYS[anime]
    for n in c["media"]["nodes"]:
        t = " ".join(filter(None, [n["title"]["romaji"], n["title"]["english"]])).lower()
        if any(k in t for k in keys):
            return True
    return False


def main() -> None:
    chars = json.loads(DATA.read_text(encoding="utf8"))
    lines: list[str] = []
    ok = 0
    for ch in chars:
        if ch.get("immagine_url"):
            ok += 1
            continue
        url = None
        extra = ALT.get(ch["id"], [])
        queries = [*extra, ch["nome"], ch["nome"].split()[0]]
        for q in dict.fromkeys(queries):
            try:
                for c in search(q):
                    if (
                        in_anime(c, ch["anime"])
                        and same_person(ch["nome"], c, extra)
                        and "default" not in c["image"]["large"]
                    ):
                        url = c["image"]["large"]
                        lines.append(f"OK    {ch['id']:28} -> {c['name']['full']}  (cerca: {q})")
                        break
            except Exception as e:
                lines.append(f"ERR   {ch['id']:28} {e}")
            time.sleep(2.2)
            if url:
                break
        if url:
            ch["immagine_url"] = url
            ok += 1
        else:
            lines.append(f"MANCA {ch['id']:28} nessun risultato nell'anime atteso")
        DATA.write_text(json.dumps(chars, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    DATA.write_text(json.dumps(chars, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    REPORT.write_text("\n".join(lines) + f"\n\nCon immagine: {ok}/{len(chars)}\n", encoding="utf8")
    print(f"Con immagine: {ok}/{len(chars)}. Rapporto: {REPORT}")


if __name__ == "__main__":
    main()
