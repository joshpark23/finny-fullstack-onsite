from __future__ import annotations

from enum import Enum
from typing import Iterable


class PokemonType(Enum):
    Grass = "Grass"
    Poison = "Poison"
    Fire = "Fire"
    Water = "Water"
    Electric = "Electric"
    Flying = "Flying"
    Ice = "Ice"
    Bug = "Bug"
    Ground = "Ground"
    Rock = "Rock"

    @property
    def key(self) -> str:
        """Lowercase key used for internal lookups (e.g., TYPE_EFFECTIVENESS)."""
        return self.value.lower()

    @classmethod
    def normalize(cls, value: str) -> str:
        """Normalize any string to a canonical capitalized enum value if possible.

        Returns the capitalized value (e.g., "Water") if it matches a known type,
        otherwise returns the input with first-letter capitalized.
        """
        if not isinstance(value, str):
            return value
        # Try to match ignoring case
        for member in cls:
            if member.value.lower() == value.lower():
                return member.value
        # Fallback: capitalize nicely
        return value.capitalize()

    @classmethod
    def keys_from_iterable(cls, values: Iterable[str]) -> list[str]:
        return [cls.normalize(v).lower() for v in values]
