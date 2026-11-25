"""Valida i dati di gioco. Uso: cd backend && uv run python ../scripts/validate_data.py"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.data_loader import load_characters, validate

errors = validate()
if errors:
    print("\n".join(f"ERRORE: {e}" for e in errors))
    sys.exit(1)
print(f"OK: {len(load_characters())} personaggi validi")
