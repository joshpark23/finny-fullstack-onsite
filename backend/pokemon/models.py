from mongoengine import DictField, Document, IntField, ListField, StringField


class Pokemon(Document):
    """A Pokemon available in the global catalog."""

    pokemon_id = IntField(required=True, unique=True)
    pokemon_name = StringField(required=True)
    types = ListField(StringField(), required=True)
    stats = DictField(required=True)

    meta = {
        "collection": "pokemon",
        "indexes": ["pokemon_id"],
    }
