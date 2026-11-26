"""Spiegazioni leggibili dello scontro (Veloce): una riga per evento e il «perché» del risultato."""

from . import tattiche as tat
from .models import Azione, Event, Fase, MatchResult, Side, Team

NOMI_TATTICA = {"assalto": "Assalto", "tecnica": "Tecnica", "guardia": "Guardia"}
LATI: tuple[Side, Side] = ("A", "B")


def _nome(squadre: dict[Side, Team], lato: Side, idx: int) -> str:
    return squadre[lato].members[idx].nome


def riga_azione(squadre: dict[Side, Team], a: Azione) -> str | None:
    """Una frase per un'azione che ha fatto danno, cura o KO (altrimenti None)."""
    chi = _nome(squadre, a.da, a.idx)
    colpi = [e for e in a.esiti if e.delta < 0]
    cure = [e for e in a.esiti if e.delta > 0]
    if colpi:
        bers = colpi[0]
        nome_b = _nome(squadre, bers.lato, bers.idx)
        tot = -sum(e.delta for e in colpi)
        extra = " (critico)" if any(e.crit for e in colpi) else ""
        if len(colpi) > 1:
            extra += f" e altri {len(colpi) - 1}"
        ko = " — KO!" if any(e.ko for e in colpi) else ""
        return f"{chi} usa {a.mossa}: −{tot} a {nome_b}{extra}{ko}"
    if cure:
        e = cure[0]
        return f"{chi} usa {a.mossa}: +{e.delta} a {_nome(squadre, e.lato, e.idx)}"
    return None


def righe_fase(
    squadre: dict[Side, Team], eventi: list[Event], fase: int, max_righe: int = 6
) -> list[str]:
    """Le righe più importanti di una fase (1-3): prima i KO, poi i colpi più grossi."""
    dentro = False
    righe: list[tuple[int, str]] = []
    for e in eventi:
        if isinstance(e, Fase):
            dentro = e.fase == fase
            continue
        if dentro and isinstance(e, Azione):
            r = riga_azione(squadre, e)
            if r:
                peso = (1000 if "KO!" in r else 0) + sum(-x.delta for x in e.esiti if x.delta < 0)
                righe.append((peso, r))
    righe.sort(key=lambda x: -x[0])
    return [r for _, r in righe[:max_righe]]


def perche(res: MatchResult) -> list[str]:
    """Tre-cinque motivi che hanno pesato di più sul risultato (punto di vista di A)."""
    out: list[str] = []
    fasi = [e for e in res.eventi if isinstance(e, Fase)]
    if fasi:
        vinte = sum(1 for f in fasi if f.esito == "A")
        perse = sum(1 for f in fasi if f.esito == "B")
        out.append(
            f"Tattiche: hai vinto il confronto in {vinte} fasi su {len(fasi)}"
            + (f", la CPU in {perse}." if perse else ".")
        )
    danno: dict[Side, int] = {"A": 0, "B": 0}
    per_unita: dict[tuple[Side, int], int] = {}
    ko: dict[Side, int] = {"A": 0, "B": 0}
    for e in res.eventi:
        if isinstance(e, Azione):
            for x in e.esiti:
                if x.delta < 0:
                    danno[e.da] += -x.delta
                    per_unita[(e.da, e.idx)] = per_unita.get((e.da, e.idx), 0) - x.delta
                if x.ko:
                    ko[x.lato] += 1
    out.append(f"Danni: hai inflitto {danno['A']}, la CPU {danno['B']}.")
    out.append(f"Sconfitti: {ko['B']} avversari contro {ko['A']} tuoi.")
    mie = {k: v for k, v in per_unita.items() if k[0] == "A"}
    if mie:
        (lato, idx), v = max(mie.items(), key=lambda kv: kv[1])
        out.append(f"Il tuo migliore: {_nome(res.squadre, lato, idx)} con {v} danni.")
    s_a = [s.nome for s in res.sinergie if s.lato == "A"]
    s_b = [s.nome for s in res.sinergie if s.lato == "B"]
    if s_a or s_b:
        out.append(
            "Sinergie: "
            + (f"tue {', '.join(s_a[:2])}" if s_a else "nessuna tua")
            + (f"; CPU {', '.join(s_b[:2])}." if s_b else "; nessuna per la CPU.")
        )
    if res.rivalita:
        out.append("Rivalità in campo: " + ", ".join(r.nome for r in res.rivalita) + ".")
    return out[:6]


def esito_fase(a: str, b: str) -> str:
    e = tat.esito(a, b)
    if e == "pari":
        return f"Pari: {NOMI_TATTICA[a]} contro {NOMI_TATTICA[b]}."
    return (
        f"Hai vinto il confronto: {NOMI_TATTICA[a]} batte {NOMI_TATTICA[b]}."
        if e == "A"
        else f"Hai perso il confronto: {NOMI_TATTICA[b]} batte {NOMI_TATTICA[a]}."
    )
