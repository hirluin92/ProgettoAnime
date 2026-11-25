from .models import Breakdown, CounterRule, Duo, Team
from .rng import Rng
from .roles import ROLES, WANTED_TAGS

FORM_MAX = 12
MAX_COUNTERS = 2
MAX_DUOS = 2
DUO_BONUS = 12


def role_fit(tags: list[str], role: str) -> int:
    common = len(set(tags) & set(WANTED_TAGS[role]))
    return 12 if common >= 2 else 4 if common == 1 else -8


def counter_bonus(nw: int, nl: int) -> int:
    return min(20, 8 + 4 * (nw - nl) + 2 * nl)


def team_counters(mine: Team, theirs: Team, rules: list[CounterRule]) -> list[tuple[str, int]]:
    """Al massimo i 2 counter migliori: lista di (relazione, bonus)."""
    found: list[tuple[str, int]] = []
    for rule in rules:
        nw = sum(rule.vince in m.tags for m in mine.members)
        nl = sum(rule.perde in m.tags for m in theirs.members)
        if nw >= 1 and nl >= 1 and nw >= nl:
            found.append((f"{rule.vince} > {rule.perde}", counter_bonus(nw, nl)))
    found.sort(key=lambda c: -c[1])  # sort stabile: a pari bonus resta l'ordine dei dati
    return found[:MAX_COUNTERS]


def team_duos(team: Team, duos: list[Duo]) -> list[tuple[tuple[int, int], str]]:
    """Coppie presenti nella squadra, al massimo 2: ((idx_a, idx_b), nome)."""
    pos = {m.id: i for i, m in enumerate(team.members)}
    return [((pos[d.a], pos[d.b]), d.nome) for d in duos if d.a in pos and d.b in pos][:MAX_DUOS]


def individual_scores(team: Team, rng: Rng) -> tuple[list[int], Breakdown]:
    """Potenza di ogni personaggio (base+ruolo+firma+forma) e riepilogo parziale."""
    powers: list[int] = []
    brk = Breakdown()
    for role, m in zip(ROLES, team.members, strict=True):
        fit = role_fit(m.tags, role)
        firma = 6 if m.ruolo_firma == role else 0
        form = rng.randint(0, FORM_MAX)
        brk.base += m.rating
        brk.ruolo += fit
        brk.firma += firma
        brk.forma += form
        powers.append(m.rating + fit + firma + form)
    return powers, brk
