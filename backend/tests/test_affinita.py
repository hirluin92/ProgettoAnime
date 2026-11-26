from app.data_loader import load_characters, load_forms
from app.engine.affinita import (
    AFF_MAX,
    AFF_MIN,
    SCARTO_MAX,
    affinita,
    moltiplicatore,
    scarto,
    tutte,
)
from app.engine.roles import ROLES
from app.engine.scoring import potenza_ruolo, statistiche_base


def test_affinity_is_bounded_and_deterministic() -> None:
    for c in load_characters().values():
        a = tutte(c)
        assert a == tutte(c)
        assert all(AFF_MIN <= v <= AFF_MAX for v in a.values())
        assert all(abs(scarto(c, r)) <= SCARTO_MAX for r in ROLES)


def test_multiplier_matches_displayed_value() -> None:
    c = load_characters()["son-goku"]
    for r in ROLES:
        assert moltiplicatore(c, r) == 1 + affinita(c, r) / 100


def test_archetypes_prefer_their_roles() -> None:
    chars = load_characters()
    goku, gaara, tsunade = chars["son-goku"], chars["gaara"], chars["tsunade"]
    assert (
        affinita(goku, "Capitano") > affinita(goku, "Guaritore") + 40
    )  # lottatore: guida, non cura
    assert max(ROLES, key=lambda r: affinita(gaara, r)) == "Tank"
    assert max(ROLES, key=lambda r: affinita(tsunade, r)) == "Guaritore"


def test_every_archetype_has_two_good_slots() -> None:
    """Nessun archetipo è bloccato in un solo ruolo: almeno due slot con affinità >= +10."""
    per_arch: dict[str, set[str]] = {}
    for c in load_characters().values():
        per_arch.setdefault(c.arch, set()).update(r for r in ROLES if affinita(c, r) >= 10)
    assert all(len(v) >= 2 for v in per_arch.values()), per_arch


def test_better_slot_means_more_power() -> None:
    c = load_characters()["kakashi-hatake"]
    best = max(ROLES, key=lambda r: affinita(c, r))
    worst = min(ROLES, key=lambda r: affinita(c, r))
    assert potenza_ruolo(c, best) > potenza_ruolo(c, worst)
    assert statistiche_base(c, best)[1] > statistiche_base(c, worst)[1]


def test_forms_are_distinct_cards_of_the_same_character() -> None:
    chars, forms = load_characters(), load_forms()
    assert len(forms) >= 20
    for f in forms.values():
        assert f.base_id in chars and f.id != f.base_id and f.forma
        assert f.nome == chars[f.base_id].nome
        assert scarto(f, "Vice") == scarto(chars[f.base_id], "Vice")  # stesso scarto della base
        assert 1 <= f.costo <= 14 and f.rating <= 99
        assert f.mossa.nome and f.passiva.nome  # oggetti validati, non dizionari
