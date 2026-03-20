from typing import List

from pydantic import BaseModel

from pokemon.models import Pokemon as PokemonDocument


class PokemonResponse(BaseModel):
    """Pokemon data returned by the API."""

    pokemon_id: int
    pokemon_name: str
    types: List[str]
    stats: dict


def serialize_pokemon(document: PokemonDocument) -> PokemonResponse:
    """Convert Pokemon Mongo document to API response schema."""

    return PokemonResponse(
        pokemon_id=document.pokemon_id,
        pokemon_name=document.pokemon_name,
        types=document.types,
        stats=document.stats,
    )
