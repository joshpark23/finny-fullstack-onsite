from typing import List

from pydantic import BaseModel, Field


class CollectionCreateRequest(BaseModel):
    """Payload for adding Pokemon to the collection."""

    pokemon_ids: List[int] = Field(min_length=1)


class CollectionDeleteRequest(BaseModel):
    """Payload for removing Pokemon from the collection."""

    pokemon_ids: List[int] = Field(min_length=1)
