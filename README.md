# Finny, Full Stack On-Site Assignment Submission - Josh

## Overview
A small full-stack demonstration app (Pokemon-themed) containing a FastAPI + MongoDB backend and a Next.js frontend. The repo is configured for local development using Docker for the backend services and pnpm for the frontend.

The backend supports:

- Creating battles between two Pokemon
- Running turn-based battle simulations asynchronously
- Persisting battle state and event history
- Streaming battle events to the frontend over SSE
- Viewing battle history and battle details

The frontend was refactored to support the live battle streaming flow and updated battle use-cases introduced during the exercise.

**Quick start (development)**

- Relies on scaffolding and dependencies provided by the initial template (Docker, Docker Compose, etc.)

Backend (from the `backend` directory):

```bash
docker compose up -d
docker exec -it pokemon_api python seed_pokemon.py
```

Frontend (from the `frontend` directory):

```bash
pnpm install
pnpm dev
```

## Code Organization

My personal preference is to organize code by domain. For monolithic architectures, I feel it offers a nice separation of concerns between modules that own their own domain boundaries. In practice, this also tends to increase team velocity as developers can work on individual domains (e.g. one team member building out collections while the another works on battling) with minimal merge conflicts.

An additional benefit of separating the code by domains is that each domain can be self-contained and standardized. For every domain, there is a top level `api.py` file for the interface, `services.py` that owns business logic, `models.py` for ORM models/schema, etc. If the team makes the decision in the future to break the monolith into a microservice architecture, this allows for a much smoother migration process/extensibility where each domain module can be extracted, with standardized components being pulled into a chassis.

## Assumptions Made

### Backend / domain assumptions

- Battle logic is intentionally simplified for the assignment:
  - damage is based on attack, defense, a small random factor, and limited type effectiveness
  - speed determines turn order
  - no abilities, movesets, status effects, critical hits, accuracy, PP, switching, or full Pokemon battle rules are modeled
- A battle is simulated as a background in-process task after creation
- MongoDB is used as the source of truth for persisted battle state and events
- Battle events are stored incrementally so the SSE stream can read and emit them as they are produced
- SSE is sufficient for one-way live updates from backend to frontend for this use case
- Idempotency is supported at the API level, assuming clients provide an idempotency key when retries matter
- The implementation is designed for a single service instance / assignment setting rather than a fully distributed production deployment

### Frontend assumptions

- The UI is intentionally minimal and optimized for demonstrating the core battle flow
- Frontend filtering, searching, and pagination were simplified during the refactor to support the updated real-time battle experience
- Pokemon data is currently mocked / locally sourced rather than fetched from a public Pokemon API


## Current Limitations

### Production readiness

Current limitations include:

- background battle execution is performed in-process rather than by a durable worker system
- battle processing would not survive application restarts or multi-instance deployments without additional infrastructure
- SSE streaming is implemented with lightweight safeguards, but not with a distributed rate-limiting or connection-management layer
- request throttling and abuse protection are limited compared with what would be expected in production
- persistence is event-oriented at the document level, but not implemented as a formal event-sourced architecture
- retries, dead-letter handling, replay flows, and recovery behavior are minimal

### Observability

The current implementation has limited observability. In a production setting I would want to add:

- structured application logging
- error logging around failed simulations and stream failures
- request tracing / correlation IDs
- metrics for battle creation, completion, failures, stream count, stream duration, reconnect rate, and event throughput (mentioned during the system design round KPIs discussion)

### Testing

Test coverage was considered out of scope from the assignment, but in a production setting I would like to add unit, integration, and e2e tests that provide strong coverage around business scenarios.

### Frontend

The current UI is intentionally simple and functional, but not polished. Some features were deferred to keep the focus on the core real-time battle flow.


## What I Would Improve With More Time

### Backend / architecture

If I had more time, I would prioritize backend production readiness first.

#### Durable asynchronous processing

The biggest architectural improvement would be moving battle execution out of in-process tasks and into a more durable event-driven system.

During the onsite system design discussion, I described a Redis + Kafka architecture to support more reliable battle processing and event sourcing. In that model:

- Redis could be used for fast coordination, caching, stream presence, and short-lived state
- Kafka could be used as the durable event backbone for battle lifecycle events such as:
  - `BattleStarted`
  - `Pokemon1Turn`
  - `Pokemon2Turn`
  - `Pokemon1Win`
  - `Pokemon2Win`
  - `BattleCompleted`
  - `BattleFailed`

That design would make it easier to support:

- durable event storage and replay
- better recovery after failures
- horizontal scaling across workers
- clearer state transitions
- better auditability of battle progression
- downstream consumers for analytics, notifications, or replays

#### Stronger SSE and API protections

I would also continue improving the streaming and API layers with:

- distributed rate limiting
- more robust connection limiting
- authenticated quotas where applicable
- better reconnect handling and resume semantics
- clearer heartbeat / keepalive behavior
- improved timeout and cleanup policies
- backpressure-aware stream handling under load

#### Data consistency and operational safeguards

Additional backend improvements would include:

- stronger idempotency guarantees backed by database constraints
- improved exception handling and failure recovery
- structured validation around persisted events
- more explicit service boundaries between simulation, persistence, and transport layers

### Frontend improvements

The frontend was refactored to support the updated real-time use-cases, but some features were intentionally deferred.

If I had more time, I would add back:

- server-side filtering
- server-side searching
- pagination

I would also improve the UI by:

- displaying more user-friendly timestamps
- opening a drawer with Pokemon details when clicking a Pokemon from the grid
- improving the overall visual polish and interaction design
- improving on empty states, loading/error states, and the overall UX