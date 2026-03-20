from mongoengine import connect, disconnect
from mongoengine.connection import get_db
from settings import Settings
import logging
from typing import Optional
import redis
from battles.models import Battle, BattleEvent
from collection.models import CollectionItem
from pokemon.models import Pokemon

logger = logging.getLogger(__name__)

# Global Redis client
_redis_client: Optional[redis.Redis] = None


def _drop_legacy_indexes():
    """Remove stale indexes from older battle schema versions."""

    db = get_db()
    battle_collection = db["battles"]
    indexes = battle_collection.index_information()
    for legacy_index in ("battle_key_1", "battle_id_1"):
        if legacy_index in indexes:
            battle_collection.drop_index(legacy_index)
            logger.info(f"Dropped legacy index: {legacy_index}")


def initialize_database(mongo_bool: bool = True, redis_bool: bool = True):
    """Initialize and configure database connections."""
    settings = Settings.instance()

    if mongo_bool:
        try:
            # Connect to MongoDB using MongoEngine
            connect(**settings.MONGO.MONGODB_SETTINGS)
            logger.info("Connected to MongoDB using MongoEngine")

            _drop_legacy_indexes()

            # Ensure document indexes are created on startup for local/dev consistency.
            Pokemon.ensure_indexes()
            CollectionItem.ensure_indexes()
            Battle.ensure_indexes()
            BattleEvent.ensure_indexes()

        except Exception as e:
            logger.error(f"Could not connect to MongoDB: {e}")
            raise

    if redis_bool:
        initialize_redis()


def initialize_redis() -> Optional[redis.Redis]:
    """Initialize Redis connection with graceful error handling."""
    global _redis_client
    settings = Settings.instance()

    try:
        _redis_client = redis.Redis.from_url(
            settings.REDIS.REDIS_URL, **settings.REDIS.connection_kwargs
        )
        # Test connection
        _redis_client.ping()
        logger.info(f"Connected to Redis at {settings.REDIS.REDIS_URL}")
        return _redis_client
    except redis.ConnectionError as e:
        logger.warning(
            f"Could not connect to Redis: {e}. Rate limiting will use in-memory fallback."
        )
        _redis_client = None
        return None
    except Exception as e:
        logger.error(f"Unexpected error connecting to Redis: {e}")
        _redis_client = None
        return None


def get_redis_client() -> Optional[redis.Redis]:
    """Get the Redis client instance. Returns None if Redis is unavailable."""
    global _redis_client

    if _redis_client is None:
        return None

    # Check if connection is still alive
    try:
        _redis_client.ping()
        return _redis_client
    except redis.ConnectionError:
        logger.warning(
            "Redis connection lost. Rate limiting will use in-memory fallback."
        )
        _redis_client = None
        return None


def close_database_connection():
    """Close database connections."""
    global _redis_client

    try:
        disconnect()
        logger.info("Disconnected from MongoDB")
    except Exception as e:
        logger.error(f"Error disconnecting from MongoDB: {e}")
    if _redis_client:
        try:
            _redis_client.close()
            logger.info("Disconnected from Redis")
        except Exception as e:
            logger.error(f"Error disconnecting from Redis: {e}")
        _redis_client = None

