from typing import Any

from pydantic import ValidationError

from app.db.models import MatchRow, new_match_id
from app.db.session import session_scope
from app.engine.models import MatchResult


def save_match(result: MatchResult, room_code: str | None = None) -> str:
    match_id = new_match_id()
    with session_scope() as s:
        s.add(
            MatchRow(
                id=match_id,
                room_code=room_code,
                seed=result.seed,
                result=result.model_dump(mode="json"),
            )
        )
    return match_id


def get_match(match_id: str) -> MatchResult | None:
    with session_scope() as s:
        row = s.get(MatchRow, match_id)
        data: dict[str, Any] | None = row.result if row else None
    if not data:
        return None
    try:
        return MatchResult.model_validate(data)
    except ValidationError:  # partita salvata con un motore precedente: non più leggibile
        return None
