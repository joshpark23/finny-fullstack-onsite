# Pokemon Explorer - Frontend Client

## Overview

This is a Next.js frontend for browsing Pokemon from an external backend API.

The app provides:

- Searchable Pokemon grid
- Infinite-scroll style progressive rendering
- Expandable cards for additional stats
- Responsive UI with Tailwind and shadcn-style components

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Package Manager**: pnpm

## Project Structure

```
src/
├── app/
│   └── page.tsx                  # Main page
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── PokemonGrid.tsx           # Grid + search + infinite behavior
│   └── PokemonCard*.tsx          # Card views
├── hooks/
│   ├── useDebounce.ts
│   ├── useInfiniteScroll.ts
│   └── usePokemonInfinite.ts     # Catalog query hook
└── lib/
    ├── api/pokemon.ts            # External API client + mapper
    └── pokemonUtils.ts
```

## External API Contract

The frontend expects:

- `GET /pokemon` returning an array
- Each item containing:
  - `pokemon_id`
  - `pokemon_name`
  - `types` (`string[]`)
  - `stats` (`object`)

Because the backend does not provide server-side pagination/filtering, the frontend:

- Filters on the client (debounced input)
- Preserves infinite-scroll UX via client-side chunking
- Uses a visual placeholder in cards (no image field from API)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- External API running on `localhost:8000`

### Installation

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local

# Start development server
pnpm dev
```

Create `.env.local` with:

```bash
NEXT_PUBLIC_POKEMON_API_BASE_URL=http://localhost:8000
```

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm lint         # Run ESLint
```

## Notes

- If direct browser requests to `localhost:8000` are blocked by CORS, add a thin Next.js proxy route to forward the request server-side.
