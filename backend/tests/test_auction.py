import pytest

from app.data_loader import load_characters
from app.engine.roles import ROLES
from app.rooms import tournament
from app.rooms.auction import Auction, BidError
from app.rooms.models import MatchRef, Player, RoomSettings
from app.rooms.protocol import (
    AuctionFinished,
    LotAssigned,
    LotSkipped,
    LotStarted,
    LotWon,
    PlayerPassed,
)

POOL = list(load_characters().values())


def make(n: int = 3, budget: int = 50, timer: int = 10) -> tuple[Auction, list[Player]]:
    players = [
        Player(id=f"p{i}", name=f"P{i}", color="#000", budget=budget, connected=True)
        for i in range(n)
    ]
    auc = Auction(
        {p.id: p for p in players}, RoomSettings(budget=budget, timer=timer), POOL, seed=1
    )
    return auc, players


def types(msgs: list) -> list[str]:
    return [m.type for m in msgs]


def test_start_emits_lot() -> None:
    auc, _ = make()
    msgs = auc.start(0)
    assert isinstance(msgs[0], LotStarted) and auc.lot is not None
    assert auc.deadline == 10


def test_bid_must_exceed_current_and_not_self_raise() -> None:
    auc, _ = make()
    auc.start(0)
    auc.place_bid("p0", 5, 1)
    with pytest.raises(BidError) as e:
        auc.place_bid("p1", 5, 2)
    assert e.value.code == "too_low"
    with pytest.raises(BidError) as e:
        auc.place_bid("p0", 9, 2)
    assert e.value.code == "already_highest"


def test_reserve_of_one_per_other_slot() -> None:
    auc, _ = make(budget=50)
    auc.start(0)
    auc.place_bid("p0", 44, 1)  # 50-44=6 = 6 altri slot liberi: ok
    auc2, _ = make(budget=50)
    auc2.start(0)
    with pytest.raises(BidError) as e:
        auc2.place_bid("p0", 45, 1)  # resterebbero 5 per 6 slot
    assert e.value.code == "reserve"


def test_timer_extends_to_at_least_five_seconds() -> None:
    auc, _ = make(timer=10)
    auc.start(0)
    msgs = auc.place_bid("p0", 1, 8)  # restano 2 s -> portato a 5 s
    assert msgs[0].deadline == 13  # type: ignore[union-attr]
    msgs = auc.place_bid("p1", 2, 9)  # restano 4 s -> 5 s
    assert msgs[0].deadline == 14  # type: ignore[union-attr]


def test_timer_not_shortened_when_plenty_left() -> None:
    auc, _ = make(timer=10)
    auc.start(0)
    msgs = auc.place_bid("p0", 1, 1)  # restano 9 s: invariato
    assert msgs[0].deadline == 10  # type: ignore[union-attr]


def test_pass_blocks_further_bids() -> None:
    auc, _ = make()
    auc.start(0)
    msgs = auc.pass_lot("p1", 1)
    assert isinstance(msgs[0], PlayerPassed)
    with pytest.raises(BidError) as e:
        auc.place_bid("p1", 3, 2)
    assert e.value.code == "passed"


def test_winner_pays_and_chooses_role() -> None:
    auc, ps = make()
    auc.start(0)
    lot = auc.lot
    auc.place_bid("p0", 7, 1)
    msgs = auc.tick(10)
    assert isinstance(msgs[0], LotWon) and msgs[0].amount == 7
    msgs = auc.assign_role("p0", "Tank", 11)
    assert isinstance(msgs[0], LotAssigned)
    assert ps[0].budget == 43 and ps[0].slots["Tank"] == lot
    assert isinstance(msgs[1], LotStarted)


def test_role_must_be_free_and_only_winner_chooses() -> None:
    auc, ps = make()
    auc.start(0)
    auc.place_bid("p0", 1, 1)
    auc.tick(10)
    with pytest.raises(BidError) as e:
        auc.assign_role("p1", "Tank", 11)
    assert e.value.code == "not_your_turn"
    ps[0].slots["Tank"] = POOL[0]
    with pytest.raises(BidError) as e:
        auc.assign_role("p0", "Tank", 11)
    assert e.value.code == "bad_role"


def test_role_timeout_auto_assigns_best_role() -> None:
    auc, ps = make()
    auc.start(0)
    lot = auc.lot
    auc.place_bid("p0", 1, 1)
    auc.tick(10)
    msgs = auc.tick(10 + 8)
    assigned = next(m for m in msgs if isinstance(m, LotAssigned))
    assert assigned.character == lot and assigned.role in ROLES
    assert ps[0].slots[assigned.role] == lot


def test_lot_without_bids_is_skipped_and_requeued() -> None:
    auc, _ = make()
    auc.start(0)
    lot, left = auc.lot, auc.lots_left
    msgs = auc.tick(10)
    assert isinstance(msgs[0], LotSkipped) and msgs[0].character == lot
    assert isinstance(msgs[1], LotStarted)
    assert auc.lots_left == left  # uno estratto, uno rimesso in fondo


def test_everyone_passing_skips_immediately() -> None:
    auc, _ = make(2)
    auc.start(0)
    auc.pass_lot("p0", 1)
    msgs = auc.pass_lot("p1", 1)
    assert any(isinstance(m, LotSkipped) for m in msgs)


def test_all_others_passed_resolves_early() -> None:
    auc, _ = make(2)
    auc.start(0)
    auc.place_bid("p0", 3, 1)
    msgs = auc.pass_lot("p1", 2)
    assert any(isinstance(m, LotWon) for m in msgs)


def test_disconnected_players_auto_pass() -> None:
    auc, ps = make()
    auc.start(0)
    ps[1].connected = False
    msgs = auc.tick(1)
    assert any(isinstance(m, PlayerPassed) and m.player_id == "p1" for m in msgs)
    with pytest.raises(BidError):
        auc.place_bid("p1", 2, 2)


def test_full_team_cannot_bid_and_leaves_auction() -> None:
    auc, ps = make()
    auc.start(0)
    for r in ROLES:
        ps[0].slots[r] = POOL[0]
    with pytest.raises(BidError) as e:
        auc.place_bid("p0", 1, 1)
    assert e.value.code == "team_full"
    assert ps[0] not in auc.active()


def test_last_player_with_free_slots_gets_lots_at_one() -> None:
    auc, ps = make(2)
    for r in ROLES:
        ps[0].slots[r] = POOL[0]
    msgs = auc.start(0)
    assigned = [m for m in msgs if isinstance(m, LotAssigned)]
    assert len(assigned) == 7 and all(a.amount == 1 and a.player_id == "p1" for a in assigned)
    assert isinstance(msgs[-1], AuctionFinished) and auc.finished
    assert ps[1].budget == 50 - 7 and ps[1].complete


def test_auction_ends_when_all_complete() -> None:
    auc, ps = make(2, budget=50)
    msgs = auc.start(0)
    now = 0.0
    guard = 0
    while not auc.finished and guard < 500:
        guard += 1
        lot_msg = auc.lot
        assert lot_msg is not None
        if auc.bidder is None:
            auc.place_bid(ps[guard % 2].id, 1, now)
        now += 20
        auc.tick(now)
        if auc.await_role:
            who = auc.await_role.player_id
            role = auc.players[who].free_roles()[0]
            auc.assign_role(who, role, now)
    assert auc.finished and all(p.complete for p in ps)
    assert msgs


def test_forced_assignment_after_many_skips() -> None:
    auc, ps = make(3)
    auc.start(0)
    now = 0.0
    got = False
    for _ in range(12):
        now += 11
        msgs = auc.tick(now)
        if any(isinstance(m, LotAssigned) and m.amount == 1 for m in msgs):
            got = True
            break
    assert got


def test_tournament_schedule_round_robin() -> None:
    for n in (2, 3, 8, 11):
        rounds = tournament.schedule(n)
        pairs = {frozenset(p) for r in rounds for p in r}
        assert len(pairs) == n * (n - 1) // 2
        for r in rounds:
            flat = [i for p in r for i in p]
            assert len(flat) == len(set(flat))
    assert tournament.schedule(8)[0] == [(0, 7), (1, 6), (2, 5), (3, 4)]


def test_standings_points_and_tiebreak() -> None:
    ms = [
        MatchRef(match_id="1", a="x", b="y", winner="x", total_a=500, total_b=400),
        MatchRef(match_id="2", a="x", b="z", winner=None, total_a=450, total_b=450),
        MatchRef(match_id="3", a="y", b="z", winner="y", total_a=470, total_b=300),
    ]
    rows = tournament.standings(["x", "y", "z"], ms)
    assert [(r.player_id, r.punti) for r in rows] == [("x", 4), ("y", 3), ("z", 1)]
