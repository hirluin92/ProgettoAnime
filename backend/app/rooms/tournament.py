import zlib

from app.rooms.models import MatchRef, StandingRow, TournamentView


def schedule(n: int) -> list[list[tuple[int, int]]]:
    """Girone all'italiana (metodo del cerchio): giornate di coppie di indici."""
    ids: list[int | None] = list(range(n))
    if n % 2:
        ids.append(None)
    m = len(ids)
    rounds: list[list[tuple[int, int]]] = []
    for _ in range(m - 1):
        pairs = []
        for i in range(m // 2):
            a, b = ids[i], ids[m - 1 - i]
            if a is not None and b is not None:
                pairs.append((a, b))
        rounds.append(pairs)
        ids = [ids[0], ids[-1], *ids[1:-1]]
    return rounds


def match_seed(room_seed: int, a: int, b: int) -> int:
    return zlib.crc32(f"{room_seed}:{a}:{b}".encode()) & 0x7FFFFFFF


def standings(player_ids: list[str], matches: list[MatchRef]) -> list[StandingRow]:
    rows = {pid: StandingRow(player_id=pid, punti=0, vittorie=0, pareggi=0, sconfitte=0, totale=0)
            for pid in player_ids}  # fmt: skip
    for m in matches:
        ra, rb = rows[m.a], rows[m.b]
        ra.totale += m.total_a
        rb.totale += m.total_b
        if m.winner is None:
            ra.punti += 1
            rb.punti += 1
            ra.pareggi += 1
            rb.pareggi += 1
        else:
            win, lose = (ra, rb) if m.winner == m.a else (rb, ra)
            win.punti += 3
            win.vittorie += 1
            lose.sconfitte += 1
    return sorted(rows.values(), key=lambda r: (-r.punti, -r.totale, r.player_id))


def build(player_ids: list[str], rounds: list[list[MatchRef]]) -> TournamentView:
    flat = [m for r in rounds for m in r]
    return TournamentView(giornate=rounds, classifica=standings(player_ids, flat))
