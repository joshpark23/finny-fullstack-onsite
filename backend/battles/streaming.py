from __future__ import annotations

import asyncio
import json
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import HTTPException, Request, status

from battles.models import Battle, BattleEvent

STREAM_POLL_INTERVAL_SECONDS = 0.5
STREAM_KEEPALIVE_SECONDS = 15.0
STREAM_MAX_DURATION_SECONDS = 60.0 * 5

MAX_TOTAL_STREAM_CONNECTIONS = 200
MAX_STREAMS_PER_IP = 5


class StreamConnectionLimiter:
    def __init__(
        self,
        max_total_connections: int,
        max_connections_per_ip: int,
    ) -> None:
        self.max_total_connections = max_total_connections
        self.max_connections_per_ip = max_connections_per_ip
        self._total_connections = 0
        self._connections_by_ip: dict[str, int] = defaultdict(int)
        self._lock = asyncio.Lock()

    @asynccontextmanager
    async def acquire(self, client_ip: str) -> AsyncIterator[None]:
        async with self._lock:
            if self._total_connections >= self.max_total_connections:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Too many active stream connections",
                )

            if self._connections_by_ip[client_ip] >= self.max_connections_per_ip:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many active stream connections for this client",
                )

            self._total_connections += 1
            self._connections_by_ip[client_ip] += 1

        try:
            yield
        finally:
            async with self._lock:
                self._total_connections -= 1
                self._connections_by_ip[client_ip] -= 1
                if self._connections_by_ip[client_ip] <= 0:
                    self._connections_by_ip.pop(client_ip, None)


stream_connection_limiter = StreamConnectionLimiter(
    max_total_connections=MAX_TOTAL_STREAM_CONNECTIONS,
    max_connections_per_ip=MAX_STREAMS_PER_IP,
)


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_battle_or_404(battle_id: str) -> Battle:
    battle = Battle.objects(battle_id=battle_id).first()
    if battle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Battle not found",
        )
    return battle


def get_events_after_sequence(
    battle_id: str,
    last_sequence: int,
) -> list[BattleEvent]:
    return list(
        BattleEvent.objects(
            battle_id=battle_id,
            sequence__gt=last_sequence,
        ).order_by("sequence")
    )


def build_event_payload(event: BattleEvent) -> dict:
    return {
        "sequence": event.sequence,
        "event_type": event.event_type,
        "actor_pokemon_id": event.actor_pokemon_id,
        "target_pokemon_id": event.target_pokemon_id,
        "damage": event.damage,
        "actor_hp_after": event.actor_hp_after,
        "target_hp_after": event.target_hp_after,
        "message": event.message,
        "created_at": event.created_at.isoformat(),
    }


def encode_sse(*, event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n"


def encode_sse_comment(comment: str) -> str:
    return f": {comment}\n\n"


def is_terminal_battle_status(status_value: str) -> bool:
    return status_value in {"completed", "failed"}


async def stream_battle_events(
    *,
    battle_id: str,
    request: Request,
) -> AsyncIterator[str]:
    """
    Stream battle events via SSE.

    Notes:
    - Polls Mongo periodically because persistence is the source of truth.
    - Sends keepalive comments so intermediaries do not close the connection.
    - Stops on disconnect, timeout, or terminal battle state.
    """
    start_monotonic = time.monotonic()
    last_keepalive_at = start_monotonic
    last_sequence = 0

    try:
        while True:
            if await request.is_disconnected():
                break

            now = time.monotonic()
            if now - start_monotonic > STREAM_MAX_DURATION_SECONDS:
                yield encode_sse(
                    event="timeout",
                    data={
                        "battle_id": battle_id,
                        "status": "timeout",
                    },
                )
                break

            fresh_events = get_events_after_sequence(battle_id, last_sequence)
            for event in fresh_events:
                yield encode_sse(
                    event=event.event_type,
                    data=build_event_payload(event),
                )
                last_sequence = event.sequence

            battle = Battle.objects.only("status").get(battle_id=battle_id)
            if is_terminal_battle_status(battle.status):
                trailing_events = get_events_after_sequence(battle_id, last_sequence)
                for event in trailing_events:
                    yield encode_sse(
                        event=event.event_type,
                        data=build_event_payload(event),
                    )
                    last_sequence = event.sequence

                final_event_type = (
                    "complete" if battle.status == "completed" else "failed"
                )
                yield encode_sse(
                    event=final_event_type,
                    data={
                        "battle_id": battle_id,
                        "status": battle.status,
                    },
                )
                break

            if now - last_keepalive_at >= STREAM_KEEPALIVE_SECONDS:
                yield encode_sse_comment("keepalive")
                last_keepalive_at = now

            await asyncio.sleep(STREAM_POLL_INTERVAL_SECONDS)

    except asyncio.CancelledError:
        raise
