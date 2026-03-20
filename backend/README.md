# Pokemon Explorer - Backend Service

## Overview

This is the backend service for the Pokemon Explorer full-stack interview assignment. You'll build APIs to support Pokemon collection management and real-time battle functionality.

**Time expectation:** 1 day (with AI assistance available)

---

## Quick Start

### Using Docker (Recommended)

```bash
# Start all services (API + MongoDB + Redis)
docker-compose up -d

# View logs
docker-compose logs -f app

# API available at http://localhost:8000
# API docs at http://localhost:8000/docs
# MongoDB UI at http://localhost:8081

# Seed initial Pokemon catalog (manual trigger)
python3 seed_pokemon.py
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| `app` | 8000 | FastAPI application |
| `mongodb` | 27017 | MongoDB database |
| `redis` | 6379 | Redis (available for bonus challenges) |
| `mongo-express` | 8081 | MongoDB admin UI |

### Data Initialization

The API starts with an empty database. Run `python3 seed_pokemon.py` when you want to populate the initial 6 Pokemon catalog records.

### Manual Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start MongoDB and Redis (via Docker)
docker-compose up -d mongodb redis

# Run the API
uvicorn main:app --reload

# Seed initial Pokemon catalog (manual trigger)
python3 seed_pokemon.py
```

---

## Requirements

### Part 1: Pokemon Collection Management

Implement persistence for user Pokemon collections.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/collection` | POST | Add a Pokemon to the collection |
| `/collection` | GET | Get all Pokemon in collection |
| `/collection/{pokemon_id}` | DELETE | Remove a Pokemon |

### Part 2: Pokemon Battle System

Implement turn-based battles with real-time streaming.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/battles` | POST | Start a new battle |
| `/battles/{id}` | GET | Get battle result |
| `/battles/{id}/stream` | GET | Stream battle updates (SSE) |
| `/battles` | GET | Battle history (paginated) |

---

## Battle Mechanics (Suggested)

1. **Turn Order:** Higher speed attacks first
2. **Damage:** `damage = attacker.attack - defender.defense + random(1, 10)`
3. **Type Effectiveness:**
   - Fire > Grass, Ice, Bug
   - Water > Fire, Ground, Rock
   - Grass > Water, Ground, Rock
   - Electric > Water, Flying
4. **Victory:** First to 0 HP loses
5. **Pacing:** 1-2 seconds between turns for UI effect

---

## Technical Requirements

- [ ] Proper error handling with HTTP status codes
- [ ] Input validation
- [ ] Idempotent battle creation (no duplicates)
- [ ] SSE streaming with graceful disconnect handling
- [ ] MongoDB for persistence

---

## Project Structure

```
├── main.py           # FastAPI application and endpoints
├── models.py         # MongoDB document models
├── database.py       # Database connection
├── settings.py       # Configuration
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

**Feel free to refactor and reorganize the codebase as you see fit.** You can add folders, split files, introduce new patterns, or restructure entirely. We're interested in seeing how you organize code.

---

## Useful Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [MongoEngine Docs](http://mongoengine.org/)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [PokeAPI](https://pokeapi.co/) - For Pokemon data

---


## Submission

1. Complete the implementation in this repository
2. Update this README with:
   - Setup instructions (if changed)
   - Tech choices and reasoning
   - Assumptions made
   - What you'd improve with more time
3. Deploy to a free service (Railway, Render, Fly.io) if possible
4. Submit repository link and deployed URL

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection |
| `DATABASE_NAME` | `pokemon_db` | Database name |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection (for bonus) |
| `LOG_LEVEL` | `INFO` | Logging level |

---

## Questions?

Document your assumptions and proceed. We value pragmatic decision-making.
