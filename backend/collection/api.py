from typing import List

from fastapi import APIRouter, HTTPException, status
from mongoengine.errors import NotUniqueError
from pymongo.errors import DuplicateKeyError

from collection.models import CollectionItem
from collection.serializers import CollectionCreateRequest, CollectionDeleteRequest
from pokemon.models import Pokemon as PokemonDocument
from pokemon.serializers import PokemonResponse, serialize_pokemon

router = APIRouter(prefix="/collection", tags=["collection"])


@router.get("", response_model=List[PokemonResponse])
async def get_collection() -> List[PokemonResponse]:
    """Return all Pokemon currently saved in the user's collection."""

    collection_ids = [
        item.pokemon_id for item in CollectionItem.objects.order_by("pokemon_id")
    ]
    pokemon_docs = PokemonDocument.objects(pokemon_id__in=collection_ids)
    pokemon_by_id = {document.pokemon_id: document for document in pokemon_docs}

    return [
        serialize_pokemon(pokemon_by_id[pokemon_id])
        for pokemon_id in collection_ids
        if pokemon_id in pokemon_by_id
    ]


@router.post(
    "",
    response_model=List[PokemonResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_to_collection(payload: CollectionCreateRequest) -> List[PokemonResponse]:
    """Add Pokemon to the user's collection from the Pokemon catalog."""

    requested_ids = payload.pokemon_ids
    pokemon_documents = PokemonDocument.objects(pokemon_id__in=requested_ids)
    pokemon_by_id = {document.pokemon_id: document for document in pokemon_documents}

    missing_ids = [pokemon_id for pokemon_id in requested_ids if pokemon_id not in pokemon_by_id]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pokemon not found",
        )

    existing_ids = {
        item.pokemon_id
        for item in CollectionItem.objects(pokemon_id__in=requested_ids)
    }
    if existing_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pokemon already exists in collection",
        )

    try:
        for pokemon_id in requested_ids:
            CollectionItem(pokemon_id=pokemon_id).save()
    except (NotUniqueError, DuplicateKeyError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pokemon already exists in collection",
        ) from None

    return [serialize_pokemon(pokemon_by_id[pokemon_id]) for pokemon_id in requested_ids]


@router.delete("/{pokemon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_collection(pokemon_id: int) -> None:
    """Remove one Pokemon from the user's collection."""

    deleted_count = CollectionItem.objects(pokemon_id=pokemon_id).delete()
    if deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pokemon is not in collection",
        )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def remove_many_from_collection(payload: CollectionDeleteRequest) -> None:
    """Remove Pokemon from the user's collection."""

    requested_ids = payload.pokemon_ids
    existing_ids = {
        item.pokemon_id
        for item in CollectionItem.objects(pokemon_id__in=requested_ids)
    }
    missing_ids = [pokemon_id for pokemon_id in requested_ids if pokemon_id not in existing_ids]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pokemon is not in collection",
        )

    CollectionItem.objects(pokemon_id__in=requested_ids).delete()
