# Pokemon Explorer - Backend Extension Assignment

## Overview

This document extends the frontend Pokemon Explorer into a **full-stack interview assignment**. You will build a backend service (in a separate repository) that integrates with this frontend application to support Pokemon collection management and real-time battle functionality.

**Time expectation:** 1 day (with AI assistance available)

---

## Requirements

### Part 1: Pokemon Collection Management

Implement persistence for user Pokemon collections (favorites/team).

#### Endpoints

| Functionality |
|---------------|
| Add a Pokemon to the user's collection |
| Retrieve all Pokemon in the user's collection |
| Remove a Pokemon from the collection |

---

### Part 2: Pokemon Battle System

Implement a turn-based battle system between two Pokemon with real-time status updates streamed to the frontend.

#### Endpoints

| Functionality |
|---------------|
| Initiate a new battle between two Pokemon |
| Get battle details and final result |
| Stream real-time battle updates to the frontend |
| Get battle history (paginated) |

---

### Battle Mechanics (Implementation Notes)

The battle system should implement turn-based combat. Here are suggested mechanics (feel free to adjust):

1. **Turn Order:** Pokemon with higher speed attacks first
2. **Damage Calculation:** `damage = attacker.attack - defender.defense + random(1, 10)`
3. **Type Effectiveness:** Implement at least these relationships:
   - Fire > Grass, Ice, Bug
   - Water > Fire, Ground, Rock
   - Grass > Water, Ground, Rock
   - Electric > Water, Flying
4. **Battle End:** First Pokemon to reach 0 HP loses
5. **Pacing:** Turns should be spaced out (e.g., 1-2 seconds) for UI effect

---

## Technical Requirements

- **Framework:** Python with FastAPI
- **Database:** MongoDB (preferred)
- Boilerplate will be provided
- Implement proper error handling with appropriate HTTP status codes
- Real-time streaming implementation must handle client disconnection gracefully
- Include basic input validation
- **Idempotency:** Duplicate battle requests must not create duplicate battles

---

## Frontend Integration (UI Suggestions)

The frontend should be extended to support these new features. Suggested UI patterns:

### Collection UI
- "Add to Collection" button on Pokemon cards
- Dedicated `/collection` page showing saved Pokemon
- Visual indicator on cards already in collection

### Battle UI
- Battle initiation: Select two Pokemon (drag-and-drop or click-to-select)
- Battle arena view:
  - Split-screen layout with Pokemon facing each other
  - Animated health bars
  - Turn indicator showing who's attacking
  - Combat log or speech bubbles showing actions
  - Type effectiveness callouts ("It's super effective!")
- Victory screen with stats summary
- Battle history page with replays

---

## Bonus Challenge

If time permits, choose **one** of the following to demonstrate depth in concurrency and scale:

### Option 1: Concurrent Battles with Rate Limiting
Allow multiple battles to run simultaneously, but limit the number of concurrent battles per user (e.g., max 3). Implement proper queuing when the limit is reached.

### Option 2: Spectator Mode
Allow multiple clients to subscribe and watch the same battle in real-time. All spectators should receive the same battle updates simultaneously.

### Option 3: Battle Queue with Matchmaking
Implement a queue-based system where battle requests are queued and processed by background workers. Optionally, implement matchmaking that pairs Pokemon with similar total stats.

---

## Submission

1. Create a new repository for your backend service
2. Include a README with:
   - Setup instructions
   - Tech stack choices and reasoning
   - Any assumptions made
   - What you would improve with more time
3. Deploy to a free hosting service (Railway, Render, Fly.io) if possible
4. Submit links to both repositories and deployed URLs

---

## Questions?

If any requirements are unclear, document your assumptions and proceed. We value pragmatic decision-making.
