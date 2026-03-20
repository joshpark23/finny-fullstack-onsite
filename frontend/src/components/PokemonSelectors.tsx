'use client'

import type { Pokemon } from '@/lib/api/pokemon'

import { usePokemonCatalog } from '@/hooks/usePokemonInfinite'


export function PokemonSelectors({
    pokemon1Input,
    pokemon2Input,
    setPokemon1Input,
    setPokemon2Input
}: {
    pokemon1Input: string
    pokemon2Input: string
    setPokemon1Input: (s: string) => void
    setPokemon2Input: (s: string) => void
}) {
    const {
        data: allPokemon = [],
        error: pokemonError,
        isFetching,
        isLoading
    } = usePokemonCatalog()

    const isCatalogLoading = isLoading || isFetching

    return (
        <>
            <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="pokemon1-id">
                    Pokemon 1
                </label>
                <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                    disabled={isCatalogLoading}
                    id="pokemon1-id"
                    onChange={e => setPokemon1Input(e.target.value)}
                    value={pokemon1Input}
                >
                    <option value="">Select a Pokemon</option>
                    {allPokemon.map((p: Pokemon) => (
                        <option key={p.id} value={String(p.id)}>
                            {`${p.id} • ${p.name}`}
                        </option>
                    ))}
                </select>
                {pokemonError && (
                    <div className="text-sm text-red-500">Failed to load Pokemon.</div>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="pokemon2-id">
                    Pokemon 2
                </label>
                <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                    disabled={isCatalogLoading}
                    id="pokemon2-id"
                    onChange={e => setPokemon2Input(e.target.value)}
                    value={pokemon2Input}
                >
                    <option value="">Select a Pokemon</option>
                    {allPokemon.map((p: Pokemon) => (
                        <option key={p.id} value={String(p.id)}>
                            {`${p.id} • ${p.name}`}
                        </option>
                    ))}
                </select>
            </div>
        </>
    )
}
