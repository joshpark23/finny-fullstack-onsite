"""Seed script for initial Pokemon catalog data."""

from database import initialize_database, close_database_connection
from pokemon.models import Pokemon

SEED_POKEMON = [
    {
        "pokemon_id": 1,
        "pokemon_name": "bulbasaur",
        "types": ["grass", "poison"],
        "stats": {"hp": 45, "attack": 49, "defense": 49, "speed": 45},
    },
    {
        "pokemon_id": 4,
        "pokemon_name": "charmander",
        "types": ["fire"],
        "stats": {"hp": 39, "attack": 52, "defense": 43, "speed": 65},
    },
    {
        "pokemon_id": 6,
        "pokemon_name": "charizard",
        "types": ["fire", "flying"],
        "stats": {"hp": 78, "attack": 84, "defense": 78, "speed": 100},
    },
    {
        "pokemon_id": 7,
        "pokemon_name": "squirtle",
        "types": ["water"],
        "stats": {"hp": 44, "attack": 48, "defense": 65, "speed": 43},
    },
    {
        "pokemon_id": 9,
        "pokemon_name": "blastoise",
        "types": ["water"],
        "stats": {"hp": 79, "attack": 83, "defense": 100, "speed": 78},
    },
    {
        "pokemon_id": 25,
        "pokemon_name": "pikachu",
        "types": ["electric"],
        "stats": {"hp": 35, "attack": 55, "defense": 40, "speed": 90},
    },
]


def seed() -> None:
    """Insert initial Pokemon documents and backfill missing stats."""

    initialize_database(redis_bool=False)
    inserted = 0
    updated = 0

    try:
        for pokemon in SEED_POKEMON:
            document = Pokemon.objects(pokemon_id=pokemon["pokemon_id"]).first()
            if document is None:
                Pokemon(**pokemon).save()
                inserted += 1
            elif not getattr(document, "stats", None):
                document.stats = pokemon["stats"]
                document.save()
                updated += 1
        print(
            f"Seeding complete. Inserted {inserted} and updated {updated} pokemon; "
            f"catalog now has {Pokemon.objects.count()} total."
        )
    finally:
        close_database_connection()


if __name__ == "__main__":
    seed()
