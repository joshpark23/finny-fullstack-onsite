from typing import List

from fastapi import APIRouter, HTTPException, status

from pokemon.models import Pokemon as PokemonDocument
from pokemon.serializers import PokemonResponse, serialize_pokemon

router = APIRouter(prefix="/pokemon", tags=["pokemon"])


@router.get("", response_model=List[PokemonResponse])
async def list_pokemon() -> List[PokemonResponse]:
    """Return all available Pokemon from the database."""

    documents = PokemonDocument.objects.order_by("pokemon_id")
    return [serialize_pokemon(document) for document in documents]


@router.get("/{pokemon_id}", response_model=PokemonResponse)
async def get_pokemon(pokemon_id: int) -> PokemonResponse:
    """Return one Pokemon from the database."""

    document = PokemonDocument.objects(pokemon_id=pokemon_id).first()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pokemon not found",
        )
    return serialize_pokemon(document)
