from datetime import datetime

from mongoengine import DateTimeField, Document, IntField


class CollectionItem(Document):
    """A Pokemon in a user's collection."""

    pokemon_id = IntField(required=True, unique=True)
    added_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "collection",
        "indexes": ["pokemon_id"],
    }
