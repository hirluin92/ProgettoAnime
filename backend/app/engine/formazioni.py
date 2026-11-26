"""Formazioni (V3): quale slot sta in prima linea, al centro o nelle retrovie. Dati puri.

Ordine degli slot: Capitano, Vice, Tank, Danno, Supporto, Supporto II, Guaritore.
0 = prima linea (incassa), 1 = centro, 2 = retrovia (colpita per ultima).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Formazione:
    id: str
    nome: str
    descrizione: str
    fila: tuple[int, ...]


FORMAZIONI: dict[str, Formazione] = {
    f.id: f
    for f in (
        Formazione(
            "classica",
            "Classica",
            "Capitano e Tank davanti, cure al sicuro.",
            (0, 1, 0, 1, 2, 2, 2),
        ),
        Formazione(
            "muro", "Muro", "Tre in prima linea: dura di più, colpisce meno.", (0, 0, 0, 1, 1, 2, 2)
        ),
        Formazione(
            "assalto",
            "Assalto",
            "Anche il Danno in prima linea: più pressione, più rischi.",
            (0, 0, 1, 0, 1, 1, 2),
        ),
        Formazione(
            "guerriglia",
            "Guerriglia",
            "Solo il Tank davanti: tutti gli altri colpiscono da lontano.",
            (1, 1, 0, 2, 2, 2, 2),
        ),
    )
}
ORDINE: tuple[str, ...] = tuple(FORMAZIONI)
DEFAULT = "classica"
