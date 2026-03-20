"""Simple turn-based battle simulation."""

import asyncio
from datetime import datetime
from random import randint
from typing import Any, AsyncIterator, Dict, List, Tuple

from battles.models import Battle, BattleEvent

TYPE_EFFECTIVENESS = {
    "fire": {"grass", "ice", "bug"},
    "water": {"fire", "ground", "rock"},
    "grass": {"water", "ground", "rock"},
    "electric": {"water", "flying"},
}


def _type_multiplier(attacker_types: List[str], defender_types: List[str]) -> float:
    multiplier = 1.0
    for attacker_type in attacker_types:
        effective_against = TYPE_EFFECTIVENESS.get(attacker_type, set())
        if any(defender_type in effective_against for defender_type in defender_types):
            multiplier *= 1.5
    return multiplier


def _calculate_damage(attacker: Dict[str, Any], defender: Dict[str, Any]) -> int:
    base = attacker["stats"]["attack"] - defender["stats"]["defense"] + randint(1, 10)
    multiplier = _type_multiplier(attacker["types"], defender["types"])
    return max(1, int(base * multiplier))


async def simulate_battle_events(
    pokemon1: Dict[str, Any], pokemon2: Dict[str, Any], turn_delay_seconds: float = 1.0
) -> AsyncIterator[Dict[str, Any]]:
    """Yield battle events with pacing for live streaming."""

    hp = {
        pokemon1["pokemon_id"]: pokemon1["stats"]["hp"],
        pokemon2["pokemon_id"]: pokemon2["stats"]["hp"],
    }

    first, second = (pokemon1, pokemon2)
    if pokemon2["stats"]["speed"] > pokemon1["stats"]["speed"]:
        first, second = (pokemon2, pokemon1)

    turns = 0
    while hp[pokemon1["pokemon_id"]] > 0 and hp[pokemon2["pokemon_id"]] > 0:
        turns += 1
        for attacker, defender in ((first, second), (second, first)):
            if hp[attacker["pokemon_id"]] <= 0 or hp[defender["pokemon_id"]] <= 0:
                break

            damage = _calculate_damage(attacker, defender)
            hp[defender["pokemon_id"]] = max(0, hp[defender["pokemon_id"]] - damage)
            actor_label = (
                "pokemon1"
                if attacker["pokemon_id"] == pokemon1["pokemon_id"]
                else "pokemon2"
            )
            yield {
                "event_type": f"{actor_label}_turn",
                "actor_pokemon_id": attacker["pokemon_id"],
                "target_pokemon_id": defender["pokemon_id"],
                "damage": damage,
                "actor_hp_after": hp[attacker["pokemon_id"]],
                "target_hp_after": hp[defender["pokemon_id"]],
                "turn": turns,
                "message": (
                    f"{attacker['pokemon_name']} hit {defender['pokemon_name']} "
                    f"for {damage} damage"
                ),
                "created_at": datetime.utcnow(),
            }

            if hp[defender["pokemon_id"]] <= 0:
                break

            # Add pacing between turns for UI streaming/animation.
            await asyncio.sleep(turn_delay_seconds)

    winner = pokemon1 if hp[pokemon1["pokemon_id"]] > 0 else pokemon2
    winner_label = (
        "pokemon1_win" if winner["pokemon_id"] == pokemon1["pokemon_id"] else "pokemon2_win"
    )
    yield {
        "event_type": winner_label,
        "actor_pokemon_id": winner["pokemon_id"],
        "target_pokemon_id": None,
        "damage": None,
        "actor_hp_after": hp[winner["pokemon_id"]],
        "target_hp_after": None,
        "turn": turns,
        "message": f"{winner['pokemon_name']} wins the battle",
        "created_at": datetime.utcnow(),
    }


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
        pokemon1["pokemon_name"] if winner_id == pokemon1["pokemon_id"] else pokemon2["pokemon_name"]
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
