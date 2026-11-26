"""Statistiche di combattimento v2: archetipo + rating + ruolo + sinergie. Funzioni pure."""

from .affinita import ADATTO_SOGLIA, affinita, moltiplicatore
from .models import Character, Duo, Side, Sinergia, Team, Tratto
from .roles import ANIME_NOMI, ROLES

# (vita, attacco, difesa, velocità) per archetipo
ARCH_PROFILO: dict[str, tuple[float, float, float, float]] = {
    "BRU": (1.00, 1.13, 0.95, 1.00),
    "ASS": (0.85, 1.22, 0.80, 1.25),
    "MAG": (0.80, 1.32, 0.75, 1.00),
    "TAN": (1.40, 0.85, 1.35, 0.80),
    "TIR": (0.85, 1.22, 0.80, 1.10),
    "SUP": (1.00, 0.90, 1.00, 1.10),
    "GUA": (1.05, 0.72, 1.00, 1.00),
    "EVO": (1.00, 1.06, 0.95, 0.95),
}

ANIME_SOGLIE: tuple[tuple[int, float], ...] = ((7, 0.14), (5, 0.09), (3, 0.04))
DUO_ATK = 0.08


def forza(rating: int) -> float:
    return float((rating / 85) ** 1.6)


def adatto(ch: Character, ruolo: str) -> bool:
    return affinita(ch, ruolo) >= ADATTO_SOGLIA


def moltiplicatore_ruolo(ch: Character, ruolo: str) -> float:
    return moltiplicatore(ch, ruolo)


def statistiche_base(ch: Character, ruolo: str) -> tuple[float, float, float, float]:
    """Vita, attacco, difesa, velocità prima di sinergie e legami."""
    k = forza(ch.rating) * moltiplicatore_ruolo(ch, ruolo)
    hp_w, atk_w, dif_w, vel_w = ARCH_PROFILO[ch.arch]
    vel = (70 + (ch.rating - 60) * 0.8) * vel_w
    return 420 * k * hp_w, 112 * k * atk_w, 30 * k * dif_w, vel


def potenza_ruolo(ch: Character, ruolo: str) -> int:
    """Numero mostrato sulla carta: valutazione corretta dal ruolo."""
    return round(ch.rating * moltiplicatore_ruolo(ch, ruolo))


def sinergie_squadra(lato: Side, team: Team, tratti: list[Tratto]) -> list[Sinergia]:
    out: list[Sinergia] = []
    per_id = {t.id: t for t in tratti}
    conteggio: dict[str, int] = {}
    for m in team.members:
        for g in m.gruppi:
            conteggio[g] = conteggio.get(g, 0) + 1
    for gid, n in conteggio.items():
        t = per_id.get(gid)
        if t is None or n < 2:
            continue
        soglia = "4" if n >= 4 else str(n)
        out.append(Sinergia(lato=lato, nome=t.nome, stat=t.stat, valore=t.soglie[soglia], membri=n))
    anime: dict[str, int] = {}
    for m in team.members:
        anime[m.anime] = anime.get(m.anime, 0) + 1
    for slug, n in sorted(anime.items()):
        for minimo, bonus in ANIME_SOGLIE:
            if n >= minimo:
                out.append(
                    Sinergia(
                        lato=lato,
                        nome=f"Universo {ANIME_NOMI.get(slug, slug)}",
                        stat="tutto",
                        valore=round(bonus * 100),
                        membri=n,
                    )
                )
                break
    return out


def legami_squadra(team: Team, duos: list[Duo]) -> list[tuple[int, int, str]]:
    pos = {(m.base_id or m.id): i for i, m in enumerate(team.members)}
    return [(pos[d.a], pos[d.b], d.nome) for d in duos if d.a in pos and d.b in pos][:2]


def ruolo_di(idx: int) -> str:
    return ROLES[idx]
