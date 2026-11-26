"""I luoghi (corsie) del Duello: una regola nota fin dall'inizio. Dati puri."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Luogo:
    id: str
    nome: str
    regola: str
    favorisce: frozenset[str]  # archetipi che qui valgono +1


LUOGHI: dict[str, Luogo] = {
    lg.id: lg
    for lg in (
        Luogo(
            "vulcano",
            "Vulcano",
            "A fine turno ogni carta qui perde 1 (minimo 1).",
            frozenset({"BRU", "TAN"}),
        ),
        Luogo(
            "ghiaccio",
            "Arena di ghiaccio",
            "Ogni lato può avere al massimo 3 carte qui.",
            frozenset({"MAG", "SUP"}),
        ),
        Luogo(
            "gravita",
            "Gravità pesante",
            "Giocare qui costa +1 energia; la potenza qui è ×1,25.",
            frozenset({"TAN", "GUA"}),
        ),
        Luogo(
            "luna",
            "Luna rossa",
            "La carta più forte di ogni lato qui ottiene +3.",
            frozenset({"ASS", "EVO"}),
        ),
        Luogo(
            "torneo",
            "Torneo del potere",
            "La prima carta che giochi qui ti dà +1 energia al turno dopo.",
            frozenset({"TIR", "BRU"}),
        ),
        Luogo(
            "nebbia",
            "Nebbia fitta",
            "Gli effetti nemici non possono bersagliare le carte qui.",
            frozenset({"TIR", "ASS"}),
        ),
    )
}
ORDINE: tuple[str, ...] = tuple(LUOGHI)
