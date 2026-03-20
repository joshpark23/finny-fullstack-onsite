from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from battles.models import Battle, BattleEvent


class BattleRequest(BaseModel):
    """Request to create a new battle."""

    pokemon1_id: int
    pokemon2_id: int
    idempotency_key: Optional[str] = None


class BattleCreatedResponse(BaseModel):
    """Response returned when a battle is accepted for background processing."""

    battle_id: str


class BattleEventResponse(BaseModel):
    """Battle event payload."""

    sequence: int
    event_type: str
    actor_pokemon_id: Optional[int] = None
    target_pokemon_id: Optional[int] = None
    damage: Optional[int] = None
    actor_hp_after: Optional[int] = None
    target_hp_after: Optional[int] = None
    message: str
    created_at: datetime


class BattleSummaryResponse(BaseModel):
    """Battle summary payload."""

    battle_id: str
    pokemon1_id: int
    pokemon2_id: int
    winner_id: Optional[int] = None
    winner_name: Optional[str] = None
    turns: int
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None


class BattleDetailResponse(BattleSummaryResponse):
    """Battle detail payload with event history."""

    events: List[BattleEventResponse]


def serialize_battle(battle: Battle) -> BattleSummaryResponse:
    return BattleSummaryResponse(
        battle_id=battle.battle_id,
        pokemon1_id=battle.pokemon1_id,
        pokemon2_id=battle.pokemon2_id,
        winner_id=battle.winner_id,
        winner_name=battle.winner_name,
        turns=battle.turns,
        status=battle.status,
        created_at=battle.created_at,
        completed_at=battle.completed_at,
    )


def serialize_battle_event(event: BattleEvent) -> BattleEventResponse:
    return BattleEventResponse(
        sequence=event.sequence,
        event_type=event.event_type,
        actor_pokemon_id=event.actor_pokemon_id,
        target_pokemon_id=event.target_pokemon_id,
        damage=event.damage,
        actor_hp_after=event.actor_hp_after,
        target_hp_after=event.target_hp_after,
        message=event.message,
        created_at=event.created_at,
    )
