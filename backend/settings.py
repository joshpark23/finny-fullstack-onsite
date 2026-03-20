import os
from typing import Dict, Any


class MongoSettings:
    """MongoDB configuration settings."""

    @property
    def MONGODB_SETTINGS(self) -> Dict[str, Any]:
        """Return MongoDB connection settings for MongoEngine."""
        mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        database_name = os.getenv("DATABASE_NAME", "contacts_db")

        # Parse MongoDB URL to extract components
        settings = {
            "db": database_name,
            "host": mongo_url,
            "connect": True,
            "serverSelectionTimeoutMS": 5000,
        }

        # Add authentication if present in URL
        if "username" in mongo_url and "password" in mongo_url:
            # MongoEngine will parse auth from the URL
            pass

        return settings


class RedisSettings:
    """Redis configuration settings for rate limiting."""

    def __init__(self):
        self.REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.REDIS_DB = int(os.getenv("REDIS_DB", "0"))
        self.REDIS_SOCKET_TIMEOUT = float(os.getenv("REDIS_SOCKET_TIMEOUT", "5.0"))
        self.REDIS_SOCKET_CONNECT_TIMEOUT = float(
            os.getenv("REDIS_SOCKET_CONNECT_TIMEOUT", "5.0")
        )

    @property
    def connection_kwargs(self) -> Dict[str, Any]:
        """Return Redis connection kwargs."""
        return {
            "db": self.REDIS_DB,
            "socket_timeout": self.REDIS_SOCKET_TIMEOUT,
            "socket_connect_timeout": self.REDIS_SOCKET_CONNECT_TIMEOUT,
            "decode_responses": True,
        }


class Settings:
    """Application settings singleton."""

    _instance = None

    def __init__(self):
        self.MONGO = MongoSettings()
        self.REDIS = RedisSettings()
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
        self.API_HOST = os.getenv("API_HOST", "0.0.0.0")
        self.API_PORT = int(os.getenv("API_PORT", "8000"))


    @classmethod
    def instance(cls):
        """Get singleton instance of Settings."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
