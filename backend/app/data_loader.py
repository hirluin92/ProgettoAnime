"""Lettura e validazione dei dati di gioco (I/O: fuori dal motore)."""

import json
from functools import lru_cache
from pathlib import Path

from app.engine.models import Character, CounterRule, Duo, Ruleset
from app.engine.roles import ROLES, VALID_TAGS

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MAX_ABOVE_95 = 10


def _read(name: str) -> list[dict[str, object]]:
    data: list[dict[str, object]] = json.loads((DATA_DIR / name).read_text(encoding="utf-8"))
    return data


@lru_cache
def load_characters() -> dict[str, Character]:
    return {c.id: c for c in (Character.model_validate(d) for d in _read("characters.json"))}


@lru_cache
def load_ruleset() -> Ruleset:
    return Ruleset(
        counters=[CounterRule.model_validate(d) for d in _read("counters.json")],
        duos=[Duo.model_validate(d) for d in _read("duos.json")],
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
    for d in rules.duos:
        for cid in (d.a, d.b):
            if cid not in chars:
                errors.append(f"duo {d.nome}: personaggio inesistente {cid}")
    for r in rules.counters:
        for t in (r.vince, r.perde):
            if t not in VALID_TAGS:
                errors.append(f"counter con tag non valido {t}")
    return errors
