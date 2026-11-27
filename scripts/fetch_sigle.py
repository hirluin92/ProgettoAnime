"""Cerca le anteprime audio (30 s) delle sigle degli anime e le abbina agli anime dei quiz.

Si lancia a mano: `python scripts/fetch_sigle.py`. Usa la Search API di iTunes/Apple Music: restano
collegamenti all'anteprima ospitata da Apple, nessun file audio è copiato nel progetto.
Salva in backend/app/quiz/data/sigle.json solo i brani trovati e abbinati a un anime.
"""

import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "backend" / "app" / "quiz" / "data"

# (anime, brano, artista, OP/ED)
BRANI = [
    ("Attack on Titan", "Guren no Yumiya", "Linked Horizon", "OP"),
    ("Attack on Titan", "Jiyuu no Tsubasa", "Linked Horizon", "OP"),
    ("Attack on Titan", "Shinzou wo Sasageyo", "Linked Horizon", "OP"),
    ("Attack on Titan", "The Rumbling", "SiM", "OP"),
    ("Attack on Titan", "Red Swan", "Yoshiki feat. HYDE", "OP"),
    ("Attack on Titan", "Akuma no Ko", "Ai Higuchi", "ED"),
    ("Demon Slayer: Kimetsu no Yaiba", "Gurenge", "LiSA", "OP"),
    ("Demon Slayer: Kimetsu no Yaiba", "Zankyosanka", "Aimer", "OP"),
    ("Demon Slayer: Kimetsu no Yaiba", "Akeboshi", "LiSA", "OP"),
    ("Demon Slayer: Kimetsu no Yaiba", "from the edge", "FictionJunction", "ED"),
    ("Jujutsu Kaisen", "Kaikai Kitan", "Eve", "OP"),
    ("Jujutsu Kaisen", "Vivid Vice", "Who-ya Extended", "OP"),
    ("Jujutsu Kaisen", "Where Our Blue Is", "Tatsuya Kitani", "OP"),
    ("Jujutsu Kaisen", "Lost in Paradise", "ALI", "ED"),
    ("Naruto", "Haruka Kanata", "ASIAN KUNG-FU GENERATION", "OP"),
    ("Naruto", "GO!!!", "FLOW", "OP"),
    ("Naruto Shippuden", "Blue Bird", "Ikimono-gakari", "OP"),
    ("Naruto Shippuden", "Silhouette", "KANA-BOON", "OP"),
    ("Naruto Shippuden", "Diver", "NICO Touches the Walls", "OP"),
    ("Naruto Shippuden", "Sign", "FLOW", "OP"),
    ("One Piece", "We Are!", "Hiroshi Kitadani", "OP"),
    ("One Piece", "We Go!", "Hiroshi Kitadani", "OP"),
    ("One Piece", "Hikari e", "Folder5", "OP"),
    ("One Piece", "Bon Voyage!", "Bon-Bon Blanco", "OP"),
    ("One Piece", "Fight Together", "Namie Amuro", "OP"),
    ("One Piece", "Wake up!", "AAA", "OP"),
    ("Dragon Ball Z", "Cha-La Head-Cha-La", "Hironobu Kageyama", "OP"),
    ("Dragon Ball Super", "Chozetsu Dynamic!", "Kazuya Yoshii", "OP"),
    ("Dragon Ball Super", "Limit-Break x Survivor", "Kiyoshi Hikawa", "OP"),
    ("Dragon Ball GT", "Dan Dan Kokoro Hikarete ku", "ZARD", "OP"),
    ("Death Note", "The WORLD", "Nightmare", "OP"),
    ("Death Note", "Alumina", "Nightmare", "ED"),
    ("Fullmetal Alchemist: Brotherhood", "Again", "YUI", "OP"),
    ("Fullmetal Alchemist: Brotherhood", "Hologram", "NICO Touches the Walls", "OP"),
    ("Fullmetal Alchemist: Brotherhood", "Golden Time Lover", "Sukima Switch", "OP"),
    ("Bleach", "Asterisk", "ORANGE RANGE", "OP"),
    ("Bleach", "Ichirin no Hana", "HIGH and MIGHTY COLOR", "OP"),
    ("Bleach", "Rolling star", "YUI", "OP"),
    ("Hunter x Hunter", "Departure!", "Masatoshi Ono", "OP"),
    ("Hunter x Hunter", "Just Awake", "Fear, and Loathing in Las Vegas", "OP"),
    ("Hunter x Hunter", "Hyouri Ittai", "Yuzu", "ED"),
    ("My Hero Academia", "The Day", "Porno Graffitti", "OP"),
    ("My Hero Academia", "Peace Sign", "Kenshi Yonezu", "OP"),
    ("My Hero Academia", "Polaris", "BLUE ENCOUNT", "OP"),
    ("My Hero Academia", "Odd Future", "UVERworld", "OP"),
    ("Tokyo Ghoul", "unravel", "TK from Ling tosite sigure", "OP"),
    ("Sword Art Online", "Crossing Field", "LiSA", "OP"),
    ("Sword Art Online", "Innocence", "Eir Aoi", "OP"),
    ("Sword Art Online", "Ignite", "Eir Aoi", "OP"),
    ("Fairy Tail", "Snow Fairy", "Funkist", "OP"),
    ("Code Geass: Lelouch of the Rebellion", "COLORS", "FLOW", "OP"),
    ("Neon Genesis Evangelion", "A Cruel Angel's Thesis", "Yoko Takahashi", "OP"),
    ("Neon Genesis Evangelion", "Fly Me to the Moon", "Claire", "ED"),
    ("Cowboy Bebop", "Tank!", "The Seatbelts", "OP"),
    ("Steins;Gate", "Hacking to the Gate", "Kanako Ito", "OP"),
    ("Spy x Family", "Mixed Nuts", "Official HIGE DANdism", "OP"),
    ("Spy x Family", "Kirari", "Fujii Kaze", "OP"),
    ("Chainsaw Man", "Kick Back", "Kenshi Yonezu", "OP"),
    ("Mob Psycho 100", "99", "MOB CHOIR", "OP"),
    ("One Punch Man", "The Hero!! ~Ikareru Ken ni Honoo wo Tomoshite~", "JAM Project", "OP"),
    ("Haikyu!!", "Imagination", "SPYAIR", "OP"),
    ("Haikyu!!", "Fly High!!", "BURNOUT SYNDROMES", "OP"),
    ("Kaguya-sama: Love is War", "Love Dramatic", "Masayuki Suzuki", "OP"),
    ("Re:ZERO -Starting Life in Another World-", "Redo", "Konomi Suzuki", "OP"),
    ("Re:ZERO -Starting Life in Another World-", "Paradisus-Paradoxum", "MYTH & ROID", "OP"),
    ("KonoSuba: God's Blessing on This Wonderful World!", "Fantastic Dreamer", "Machico", "OP"),
    ("Fire Force", "Inferno", "Mrs. GREEN APPLE", "OP"),
    ("Dr. STONE", "Good Morning World!", "BURNOUT SYNDROMES", "OP"),
    ("Vinland Saga", "MUKANJYO", "Survive Said The Prophet", "OP"),
    ("Your Name.", "Zenzenzense", "RADWIMPS", "OP"),
    ("Weathering With You", "Grand Escape", "RADWIMPS", "OP"),
    ("Digimon Adventure", "Butter-Fly", "Koji Wada", "OP"),
    ("Sailor Moon", "Moonlight Densetsu", "DALI", "OP"),
    ("Black Clover", "Black Catcher", "Vickeblanka", "OP"),
    ("Dandadan", "Otonoke", "Creepy Nuts", "OP"),
    ("Bocchi the Rock!", "Seishun Complex", "Kessoku Band", "OP"),
    ("Oshi no Ko", "Idol", "YOASOBI", "OP"),
    ("Frieren: Beyond Journey's End", "Yuusha", "YOASOBI", "OP"),
    ("Blue Lock", "Chaos ga Kiwami Sugite Yabai", "UNISON SQUARE GARDEN", "OP"),
    ("Mushoku Tensei: Jobless Reincarnation", "Tabun, Mirai", "Mikuni Shimokawa", "OP"),
    ("Gintama", "Pray", "Tomoyo Ura", "OP"),
    ("Toradora!", "Pre-Parade", "Rie Kugimiya", "OP"),
    ("Toradora!", "Silky Heart", "Yui Horie", "OP"),
    ("Clannad", "Megumeru", "Lia", "OP"),
    ("Angel Beats!", "My Soul, Your Beats!", "Lia", "OP"),
    ("Madoka Magica", "Connect", "ClariS", "OP"),
    ("Psycho-Pass", "abnormalize", "Ling tosite sigure", "OP"),
    ("Parasyte -the maxim-", "Let Me Hear", "Fear, and Loathing in Las Vegas", "OP"),
    ("The Promised Neverland", "Touch Off", "UVERworld", "OP"),
    ("Assassination Classroom", "Seishun Satsubatsuron", "3-nen E-gumi Utatan", "OP"),
    ("Soul Eater", "Resonance", "T.M.Revolution", "OP"),
    ("Inuyasha", "Change the World", "V6", "OP"),
    ("Samurai Champloo", "Battlecry", "Nujabes", "OP"),
]  # fmt: skip

# abbinamenti rifiutati dopo il controllo a mano: cover, strumentali, versioni di altri artisti
SCARTA = ("原曲", "ユア", "α波", "夕星", "Instrumental", "帰りたくなったよ", "フランク", "たぶんオーライ", "エリック")

UA = {"User-Agent": "arena-anime-quiz-fetch/1.0"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def cerca(brano: str, artista: str) -> dict | None:
    for paese in ("JP", "US"):
        q = urllib.parse.urlencode(
            {"term": f"{artista} {brano}", "entity": "song", "limit": 8, "country": paese}
        )
        req = urllib.request.Request(f"https://itunes.apple.com/search?{q}", headers=UA)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                risultati = json.load(r)["results"]
        except Exception as e:  # noqa: BLE001
            print("  rete:", e, file=sys.stderr)
            time.sleep(5)
            continue
        nb, na = norm(brano), norm(artista)
        for t in risultati:
            if not t.get("previewUrl"):
                continue
            titolo = norm(t["trackName"])
            artista_t = norm(t["artistName"])
            # artista in alfabeto non latino: ci si fida del titolo
            artista_ok = not artista_t or bool(set(na.split()) & set(artista_t.split()))
            if (nb in titolo or titolo in nb) and artista_ok:
                return t
        time.sleep(1.5)
    return None


def anime_per_titolo(anime: list[dict], nome: str) -> dict | None:
    n = norm(nome)
    for a in anime:
        chiavi = [a["titolo"], a["titolo_en"], *a["sinonimi"]]
        if any(norm(c) == n for c in chiavi if c):
            return a
    for a in anime:  # corrispondenza parziale sul titolo inglese o romaji
        if any(n and (n in norm(c) or norm(c) in n) and len(norm(c)) > 4 for c in (a["titolo"], a["titolo_en"]) if c):
            return a
    return None


if __name__ == "__main__":
    anime = json.loads((DATA / "anime.json").read_text(encoding="utf-8"))
    out = []
    for nome, brano, artista, tipo in BRANI:
        a = anime_per_titolo(anime, nome)
        if a is None:
            print(f"anime non trovato: {nome}")
            continue
        t = cerca(brano, artista)
        if t is None:
            print(f"brano non trovato: {artista} - {brano}")
            continue
        if any(x in t["trackName"] + t["artistName"] for x in SCARTA):
            print(f"scartato: {t['artistName']} - {t['trackName']}")
            continue
        out.append(
            {
                "anime_id": a["id"],
                "brano": t["trackName"],
                "artista": t["artistName"],
                "brano_lat": brano,  # titolo e artista in caratteri latini (per cercarli e scriverli)
                "artista_lat": artista,
                "tipo": tipo,
                "anteprima": t["previewUrl"],
                "apple": t["trackViewUrl"],
            }
        )
        print(f"ok  {a['titolo']}: {t['trackName']}")
        time.sleep(1.2)
    (DATA / "sigle.json").write_text(
        json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"{len(out)} sigle salvate")
