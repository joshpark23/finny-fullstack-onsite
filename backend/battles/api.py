from __future__ import annotations

import asyncio
from typing import List
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse

from battles.models import Battle, BattleEvent
from battles.serializers import (
    BattleCreatedResponse,
    BattleDetailResponse,
    BattleRequest,
    BattleSummaryResponse,
    serialize_battle,
    serialize_battle_event,
)
from battles.services import run_battle_simulation
from battles.streaming import (
    get_battle_or_404,
    get_client_ip,
    stream_battle_events,
    stream_connection_limiter,
)
from pokemon.models import Pokemon

router = APIRouter(prefix="/battles", tags=["battles"])
_running_simulation_tasks: set[asyncio.Task] = set()


def _track_task(task: asyncio.Task) -> None:
    _running_simulation_tasks.add(task)
    task.add_done_callback(_running_simulation_tasks.discard)


def _get_pokemon_or_404(pokemon_id: int) -> Pokemon:
    pokemon = Pokemon.objects(pokemon_id=pokemon_id).first()
    if pokemon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pokemon {pokemon_id} not found",
        )
    return pokemon


def _build_pokemon_payload(pokemon: Pokemon) -> dict:
    return {
        "pokemon_id": pokemon.pokemon_id,
        "pokemon_name": pokemon.pokemon_name,
        "types": pokemon.types,
        "stats": pokemon.stats,
    }


@router.post(
    "", response_model=BattleCreatedResponse, status_code=status.HTTP_201_CREATED
)
async def create_battle(payload: BattleRequest) -> BattleCreatedResponse:
    if payload.pokemon1_id == payload.pokemon2_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A battle requires two different pokemon",
        )

    if payload.idempotency_key:
        existing = Battle.objects(idempotency_key=payload.idempotency_key).first()
        if existing is not None:
            return BattleCreatedResponse(battle_id=existing.battle_id)

    pokemon1 = _get_pokemon_or_404(payload.pokemon1_id)
    pokemon2 = _get_pokemon_or_404(payload.pokemon2_id)

    battle_id = str(uuid4())
    Battle(
        battle_id=battle_id,
        pokemon1_id=payload.pokemon1_id,
        pokemon2_id=payload.pokemon2_id,
        status="running",
        idempotency_key=payload.idempotency_key,
    ).save()

    task = asyncio.create_task(
        run_battle_simulation(
            battle_id=battle_id,
            pokemon1=_build_pokemon_payload(pokemon1),
            pokemon2=_build_pokemon_payload(pokemon2),
        )
    )
    _track_task(task)

    return BattleCreatedResponse(battle_id=battle_id)


@router.get("", response_model=List[BattleSummaryResponse])
async def list_battles(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> List[BattleSummaryResponse]:
    battles = (
        Battle.objects(
            status__in=["running", "completed", "failed"],
            battle_id__ne=None,
            pokemon1_id__ne=None,
            pokemon2_id__ne=None,
        )
        .order_by("-created_at")
        .skip(offset)
        .limit(limit)
    )
    return [serialize_battle(battle) for battle in battles]


@router.get("/{battle_id}", response_model=BattleDetailResponse)
async def get_battle(battle_id: str) -> BattleDetailResponse:
    battle = get_battle_or_404(battle_id)
    events = BattleEvent.objects(battle_id=battle_id).order_by("sequence")
    return BattleDetailResponse(
        **serialize_battle(battle).model_dump(),
        events=[serialize_battle_event(event) for event in events],
    )


@router.get("/{battle_id}/stream")
async def stream_battle(battle_id: str, request: Request) -> StreamingResponse:
    get_battle_or_404(battle_id)
    client_ip = get_client_ip(request)

    async def guarded_event_generator():
        async with stream_connection_limiter.acquire(client_ip):
            async for chunk in stream_battle_events(
                battle_id=battle_id, request=request
            ):
                yield chunk

    return StreamingResponse(
        guarded_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
