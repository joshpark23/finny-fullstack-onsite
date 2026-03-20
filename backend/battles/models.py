from datetime import datetime

from mongoengine import DateTimeField, Document, IntField, StringField


class Battle(Document):
    """A battle execution and its final result."""

    battle_id = StringField(required=True)
    pokemon1_id = IntField(required=True)
    pokemon2_id = IntField(required=True)
    status = StringField(required=True, choices=["running", "completed", "failed"])
    winner_id = IntField(null=True)
    winner_name = StringField(null=True)
    turns = IntField(default=0)
    idempotency_key = StringField(null=True, sparse=True, unique=True)
    created_at = DateTimeField(default=datetime.utcnow)
    completed_at = DateTimeField(null=True)

    meta = {
        "collection": "battles",
        "indexes": [
            "battle_id",
            "status",
            "-created_at",
            {"fields": ["idempotency_key"], "unique": True, "sparse": True},
        ],
        # Backward-compatible reads if legacy documents contain extra fields.
        "strict": False,
    }


class BattleEvent(Document):
    """Append-only events for battle replay/history."""

    battle_id = StringField(required=True)
    sequence = IntField(required=True)
    event_type = StringField(required=True)
    actor_pokemon_id = IntField(null=True)
    target_pokemon_id = IntField(null=True)
    damage = IntField(null=True)
    actor_hp_after = IntField(null=True)
    target_hp_after = IntField(null=True)
    message = StringField(required=True)
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "battle_events",
        "indexes": [
            "battle_id",
            {"fields": ["battle_id", "sequence"], "unique": True},
        ],
        "strict": False,
    }
