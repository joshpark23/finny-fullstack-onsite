from datetime import datetime
from typing import Any, Dict, List, Tuple

from battles.simulation import simulate_battle_events
from battles.models import Battle, BattleEvent


async def simulate_battle(
    pokemon1: Dict[str, Any], pokemon2: Dict[str, Any], turn_delay_seconds: float = 1.0
) -> Tuple[int, str, int, List[Dict[str, Any]]]:
    """Simulate battle and return winner_id, winner_name, turns, events."""

    events: List[Dict[str, Any]] = []
    async for event in simulate_battle_events(
        pokemon1, pokemon2, turn_delay_seconds=turn_delay_seconds
    ):
        events.append(event)

    winner_event = events[-1]
    winner_id = winner_event["actor_pokemon_id"]
    winner_name = (
        pokemon1["pokemon_name"]
        if winner_id == pokemon1["pokemon_id"]
        else pokemon2["pokemon_name"]
    )
    turns = max((event.get("turn", 0) for event in events), default=0)
    return winner_id, winner_name, turns, events


async def run_battle_simulation(
    battle_id: str,
    pokemon1: Dict[str, Any],
    pokemon2: Dict[str, Any],
    turn_delay_seconds: float = 1.0,
) -> None:
    """Run battle simulation in the background and persist results incrementally."""

    battle = Battle.objects(battle_id=battle_id).first()
    if battle is None:
        return

    try:
        turns = 0
        winner_id = None
        winner_name = None
        sequence = 0
        async for event in simulate_battle_events(
            pokemon1, pokemon2, turn_delay_seconds=turn_delay_seconds
        ):
            sequence += 1
            turns = max(turns, event.get("turn", 0))
            if event["event_type"].endswith("_win"):
                winner_id = event["actor_pokemon_id"]
                winner_name = (
                    pokemon1["pokemon_name"]
                    if winner_id == pokemon1["pokemon_id"]
                    else pokemon2["pokemon_name"]
                )
            BattleEvent(
                battle_id=battle_id,
                sequence=sequence,
                event_type=event["event_type"],
                actor_pokemon_id=event["actor_pokemon_id"],
                target_pokemon_id=event["target_pokemon_id"],
                damage=event["damage"],
                actor_hp_after=event["actor_hp_after"],
                target_hp_after=event["target_hp_after"],
                message=event["message"],
                created_at=event["created_at"],
            ).save()

        battle.status = "completed"
        battle.winner_id = winner_id
        battle.winner_name = winner_name
        battle.turns = turns
        battle.completed_at = datetime.utcnow()
        battle.save()
    except Exception:
        battle.status = "failed"
        battle.completed_at = datetime.utcnow()
        battle.save()
