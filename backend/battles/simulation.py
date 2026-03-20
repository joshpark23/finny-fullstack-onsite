from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from random import randint
from typing import Any, AsyncIterator

TYPE_EFFECTIVENESS: dict[str, set[str]] = {
    "fire": {"grass", "ice", "bug"},
    "water": {"fire", "ground", "rock"},
    "grass": {"water", "ground", "rock"},
    "electric": {"water", "flying"},
}


@dataclass(frozen=True)
class BattlePokemon:
    pokemon_id: int
    pokemon_name: str
    types: list[str]
    stats: dict[str, int]


def to_battle_pokemon(payload: dict[str, Any]) -> BattlePokemon:
    return BattlePokemon(
        pokemon_id=payload["pokemon_id"],
        pokemon_name=payload["pokemon_name"],
        types=payload["types"],
        stats=payload["stats"],
    )


def type_multiplier(attacker: BattlePokemon, defender: BattlePokemon) -> float:
    multiplier = 1.0
    for attacker_type in attacker.types:
        if any(
            defender_type in TYPE_EFFECTIVENESS.get(attacker_type, set())
            for defender_type in defender.types
        ):
            multiplier *= 1.5
    return multiplier


def calculate_damage(
    attacker: BattlePokemon, defender: BattlePokemon
) -> tuple[int, float]:
    base_damage = attacker.stats["attack"] - defender.stats["defense"] + randint(1, 10)
    multiplier = type_multiplier(attacker, defender)
    damage = max(1, int(base_damage * multiplier))
    return damage, multiplier


def determine_turn_order(
    pokemon1: BattlePokemon,
    pokemon2: BattlePokemon,
) -> tuple[BattlePokemon, BattlePokemon]:
    if pokemon2.stats["speed"] > pokemon1.stats["speed"]:
        return pokemon2, pokemon1
    return pokemon1, pokemon2


def build_turn_event(
    *,
    attacker: BattlePokemon,
    defender: BattlePokemon,
    pokemon1_id: int,
    damage: int,
    multiplier: float,
    turn: int,
    actor_hp_after: int,
    target_hp_after: int,
) -> dict[str, Any]:
    actor_label = "pokemon1" if attacker.pokemon_id == pokemon1_id else "pokemon2"
    return {
        "event_type": f"{actor_label}_turn",
        "actor_pokemon_id": attacker.pokemon_id,
        "target_pokemon_id": defender.pokemon_id,
        "damage": damage,
        "actor_hp_after": actor_hp_after,
        "target_hp_after": target_hp_after,
        "turn": turn,
        "message": (
            f"{attacker.pokemon_name} hit {defender.pokemon_name} for {damage} damage"
            + (" It was super effective!" if multiplier > 1.0 else "")
        ),
        "created_at": datetime.now(timezone.utc),
    }


def build_winner_event(
    *,
    winner: BattlePokemon,
    pokemon1_id: int,
    turn: int,
    winner_hp_after: int,
) -> dict[str, Any]:
    winner_label = (
        "pokemon1_win" if winner.pokemon_id == pokemon1_id else "pokemon2_win"
    )
    return {
        "event_type": winner_label,
        "actor_pokemon_id": winner.pokemon_id,
        "target_pokemon_id": None,
        "damage": None,
        "actor_hp_after": winner_hp_after,
        "target_hp_after": None,
        "turn": turn,
        "message": f"{winner.pokemon_name} wins the battle",
        "created_at": datetime.now(timezone.utc),
    }


async def simulate_battle_events(
    pokemon1_payload: dict[str, Any],
    pokemon2_payload: dict[str, Any],
    turn_delay_seconds: float = 1.0,
) -> AsyncIterator[dict[str, Any]]:
    pokemon1 = to_battle_pokemon(pokemon1_payload)
    pokemon2 = to_battle_pokemon(pokemon2_payload)

    hp = {
        pokemon1.pokemon_id: pokemon1.stats["hp"],
        pokemon2.pokemon_id: pokemon2.stats["hp"],
    }

    first, second = determine_turn_order(pokemon1, pokemon2)

    turn = 0
    while hp[pokemon1.pokemon_id] > 0 and hp[pokemon2.pokemon_id] > 0:
        turn += 1
        for attacker, defender in ((first, second), (second, first)):
            if hp[attacker.pokemon_id] <= 0 or hp[defender.pokemon_id] <= 0:
                break

            damage, multiplier = calculate_damage(attacker, defender)
            hp[defender.pokemon_id] = max(0, hp[defender.pokemon_id] - damage)

            yield build_turn_event(
                attacker=attacker,
                defender=defender,
                pokemon1_id=pokemon1.pokemon_id,
                damage=damage,
                multiplier=multiplier,
                turn=turn,
                actor_hp_after=hp[attacker.pokemon_id],
                target_hp_after=hp[defender.pokemon_id],
            )

            if hp[defender.pokemon_id] <= 0:
                break

            await asyncio.sleep(turn_delay_seconds)

    winner = pokemon1 if hp[pokemon1.pokemon_id] > 0 else pokemon2
    yield build_winner_event(
        winner=winner,
        pokemon1_id=pokemon1.pokemon_id,
        turn=turn,
        winner_hp_after=hp[winner.pokemon_id],
    )
