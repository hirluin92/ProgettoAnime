"""Lettura e validazione dei dati di gioco (I/O: fuori dal motore)."""

import json
from functools import lru_cache
from pathlib import Path

from app.engine.models import Character, Duo, Ruleset, Tratto
from app.engine.roles import ARCH_NOMI, ROLES, VALID_TAGS

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MAX_ABOVE_95 = 10


def _read(name: str) -> list[dict[str, object]]:
    data: list[dict[str, object]] = json.loads((DATA_DIR / name).read_text(encoding="utf-8"))
    return data


def _schede() -> dict[str, dict[str, object]]:
    data: dict[str, dict[str, object]] = json.loads(
        (DATA_DIR / "schede.json").read_text(encoding="utf-8")
    )
    return data


@lru_cache
def load_characters() -> dict[str, Character]:
    schede = _schede()
    out: dict[str, Character] = {}
    for d in _read("characters.json"):
        sc = schede.get(str(d["id"]))
        if sc is not None:
            d = {**d, "arch": sc["arch"], "mossa": sc["mossa"], "passiva": sc["passiva"],
                 "gruppi": sc["tratti"], "costo": sc.get("costo", 6)}  # fmt: skip
        c = Character.model_validate(d)
        out[c.id] = c
    return out


@lru_cache
def load_forms() -> dict[str, Character]:
    """Forme alternative (V3): stesso personaggio, scheda e prezzo diversi. Id: <base>--<forma>."""
    base = load_characters()
    out: dict[str, Character] = {}
    for d in _read("forme.json"):
        b = base[str(d["base"])]
        upd: dict[str, object] = {
            "id": f"{b.id}--{d['slug']}",
            "forma": d["forma"],
            "base_id": b.id,
            "rating": min(99, b.rating + int(d["rating_delta"])),  # type: ignore[call-overload]
            "mossa": d["mossa"],
            "passiva": d["passiva"],
            "costo": max(1, min(14, b.costo + int(d["costo_delta"]))),  # type: ignore[call-overload]
        }
        if "arch" in d:
            upd["arch"] = d["arch"]
        c = Character.model_validate({**b.model_dump(), **upd})
        out[c.id] = c
    return out


@lru_cache
def load_ruleset() -> Ruleset:
    return Ruleset(
        duos=[Duo.model_validate(d) for d in _read("duos.json")],
        tratti=[Tratto.model_validate(d) for d in _read("tratti.json")],
        rivalita=[Duo.model_validate(d) for d in _read("rivalita.json")],
    )


def validate() -> list[str]:
    """Restituisce l'elenco degli errori (vuoto se i dati sono validi)."""
    errors: list[str] = []
    chars = load_characters()
    raw_ids = [d["id"] for d in _read("characters.json")]
    if len(raw_ids) != len(set(raw_ids)):
        errors.append("id personaggio duplicati")
    for c in chars.values():
        bad = set(c.tags) - VALID_TAGS
        if bad:
            errors.append(f"{c.id}: tag non validi {sorted(bad)}")
        if c.ruolo_firma not in ROLES:
            errors.append(f"{c.id}: ruolo_firma non valido {c.ruolo_firma}")
    if sum(c.rating > 95 for c in chars.values()) > MAX_ABOVE_95:
        errors.append(f"più di {MAX_ABOVE_95} personaggi sopra 95")
    rules = load_ruleset()
    for d in [*rules.duos, *rules.rivalita]:
        for cid in (d.a, d.b):
            if cid not in chars:
                errors.append(f"duo {d.nome}: personaggio inesistente {cid}")
    schede = _schede()
    for cid in chars:
        sc = schede.get(cid)
        if sc is None:
            errors.append(f"{cid}: scheda di combattimento mancante")
            continue
        if sc["arch"] not in ARCH_NOMI:
            errors.append(f"{cid}: archetipo non valido {sc['arch']}")
    for fd in _read("forme.json"):
        if str(fd["base"]) not in chars:
            errors.append(f"forma {fd['slug']}: personaggio base inesistente {fd['base']}")
    ids_tratti = {t.id for t in rules.tratti}
    for c in chars.values():
        for g in c.gruppi:
            if g not in ids_tratti:
                errors.append(f"{c.id}: tratto sconosciuto {g}")
    return errors
