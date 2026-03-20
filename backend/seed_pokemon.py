"""Seed script for initial Pokemon catalog data."""

from database import initialize_database, close_database_connection
from pokemon.models import Pokemon

SEED_POKEMON = [
    {
        "pokemon_id": 1,
        "pokemon_name": "Bulbasaur",
        "types": ["Grass", "Poison"],
        "stats": {"hp": 45, "attack": 49, "defense": 49, "speed": 45},
    },
    {
        "pokemon_id": 4,
        "pokemon_name": "Charmander",
        "types": ["Fire"],
        "stats": {"hp": 39, "attack": 52, "defense": 43, "speed": 65},
    },
    {
        "pokemon_id": 6,
        "pokemon_name": "Charizard",
        "types": ["Fire", "Flying"],
        "stats": {"hp": 78, "attack": 84, "defense": 78, "speed": 100},
    },
    {
        "pokemon_id": 7,
        "pokemon_name": "Squirtle",
        "types": ["Water"],
        "stats": {"hp": 44, "attack": 48, "defense": 65, "speed": 43},
    },
    {
        "pokemon_id": 9,
        "pokemon_name": "Blastoise",
        "types": ["Water"],
        "stats": {"hp": 79, "attack": 83, "defense": 100, "speed": 78},
    },
    {
        "pokemon_id": 25,
        "pokemon_name": "Pikachu",
        "types": ["Electric"],
        "stats": {"hp": 35, "attack": 55, "defense": 40, "speed": 90},
    },
]


def seed() -> None:
    """Insert initial Pokemon documents and backfill missing fields."""

    initialize_database(redis_bool=False)
    inserted = 0
    updated = 0

    try:
        for pokemon in SEED_POKEMON:
            qs = Pokemon.objects(pokemon_id=pokemon["pokemon_id"])
            existed = qs.first() is not None
            set_kwargs = {
                f"set__{k}": v for k, v in pokemon.items() if k != "pokemon_id"
            }
            qs.update_one(upsert=True, **set_kwargs)
            if existed:
                updated += 1
            else:
                inserted += 1
        print(
            f"Seeding complete. Inserted {inserted} and updated {updated} pokemon; "
            f"catalog now has {Pokemon.objects.count()} total."
        )
    finally:
        close_database_connection()


if __name__ == "__main__":
    seed()
