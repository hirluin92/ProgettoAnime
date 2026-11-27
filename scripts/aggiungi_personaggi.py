"""Aggiunge i nuovi personaggi a characters.json, duos.json e rivalita.json (idempotente).

Uso: python scripts/aggiungi_personaggi.py && python scripts/gen_schede.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nuovi_personaggi import DUOS_NUOVI, PERSONAGGI, RIVALITA_NUOVE  # noqa: E402

BASE = Path(__file__).resolve().parent.parent / "backend" / "data"


def carica(nome: str):  # type: ignore[no-untyped-def]
    return json.loads((BASE / nome).read_text(encoding="utf8"))


def salva(nome: str, dati, indent: int = 2) -> None:  # type: ignore[no-untyped-def]
    testo = json.dumps(dati, ensure_ascii=False, indent=indent) + "\n"
    (BASE / nome).write_text(testo, encoding="utf8", newline="\n")


if __name__ == "__main__":
    chars = carica("characters.json")
    ids = {c["id"] for c in chars}
    nuovi = 0
    for i, nome, anime, ruolo, tags, voto, img in PERSONAGGI:
        if i in ids:
            continue
        chars.append(
            {
                "id": i,
                "nome": nome,
                "anime": anime,
                "ruolo_firma": ruolo,
                "tags": tags,
                "rating": voto,
                "immagine_url": img,
            }
        )
        nuovi += 1
    salva("characters.json", chars)
    for file, coppie in (("duos.json", DUOS_NUOVI), ("rivalita.json", RIVALITA_NUOVE)):
        dati = carica(file)
        gia = {frozenset((d["a"], d["b"])) for d in dati}
        for a, b, nome in coppie:
            if frozenset((a, b)) not in gia:
                dati.append({"a": a, "b": b, "nome": nome})
        salva(file, dati, indent=1 if file == "rivalita.json" else 2)
    print(f"aggiunti {nuovi} personaggi; totale {len(chars)}")
