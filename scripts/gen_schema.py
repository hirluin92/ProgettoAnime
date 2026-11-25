"""Genera i JSON Schema dei tipi condivisi in frontend/lib/schema (poi: npm run gen:types)."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from pydantic import TypeAdapter  # noqa: E402

from app.engine.models import MatchResult  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "frontend" / "lib" / "schema"
OUT.mkdir(parents=True, exist_ok=True)
SCHEMAS: dict[str, object] = {"match": MatchResult}

try:
    from app.rooms.protocol import ClientMessage, ServerMessage

    SCHEMAS["client"] = ClientMessage
    SCHEMAS["server"] = ServerMessage
except ImportError:
    pass

for name, tp in SCHEMAS.items():
    schema = TypeAdapter(tp).json_schema(mode="serialization")
    (OUT / f"{name}.json").write_text(json.dumps(schema, indent=2), encoding="utf-8")
    print("scritto", name)
