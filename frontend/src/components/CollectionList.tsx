'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import type { Pokemon } from '@/lib/api/pokemon'

import { useDebounce } from '@/hooks/useDebounce'
import { usePokemonCollection } from '@/hooks/usePokemonCollection'
import { removePokemonFromCollection } from '@/lib/api/pokemon'
import { getTypeColor } from '@/lib/pokemonUtils'

import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { Input } from './ui/input'

export default function CollectionList() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const normalizedSearch = debouncedSearch.trim().toLowerCase()
    const [selectedPokemonIds, setSelectedPokemonIds] = useState<Set<number>>(
        new Set()
    )

    const { data = [], error, isLoading } = usePokemonCollection()

    const filteredPokemon = useMemo(() => {
        if (!normalizedSearch) return data
        return data.filter(pokemon => {
            const name = pokemon.name.toLowerCase()
            const hasType = pokemon.types.some(type =>
                type.toLowerCase().includes(normalizedSearch)
            )
            return name.includes(normalizedSearch) || hasType
        })
    }, [data, normalizedSearch])
    const hasSelections = selectedPokemonIds.size > 0
    const allFilteredSelected =
        filteredPokemon.length > 0 &&
        filteredPokemon.every(p => selectedPokemonIds.has(p.id))

    const togglePokemonSelection = (id: number, checked: boolean) => {
        setSelectedPokemonIds(prev => {
            const next = new Set(prev)
            if (checked) {
                next.add(id)
            } else {
                next.delete(id)
            }
            return next
        })
    }

    const handleToggleSelectAll = (checked: boolean) => {
        setSelectedPokemonIds(prev => {
            const next = new Set(prev)
            const filteredIds = filteredPokemon.map(p => p.id)
            if (checked) {
                filteredIds.forEach(id => next.add(id))
            } else {
                filteredIds.forEach(id => next.delete(id))
            }
            return next
        })
    }

    const unsaveSelectedMutation = useMutation({
        mutationFn: (pokemonIds: number[]) =>
            removePokemonFromCollection(pokemonIds),
        onSuccess: () => {
            setSelectedPokemonIds(new Set())
            void queryClient.invalidateQueries({
                queryKey: ['pokemon-collection']
            })
        }
    })

    const handleUnsaveSelected = () => {
        if (!hasSelections || unsaveSelectedMutation.isPending) return
        unsaveSelectedMutation.mutate(Array.from(selectedPokemonIds))
    }

    return (
        <div className="space-y-4">
            <Input
                onChange={e => setSearch(e.target.value)}
                placeholder="Search saved pokemon"
                value={search}
            />
            <div className="flex min-h-10 items-center justify-between gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                        checked={allFilteredSelected}
                        onChange={e => handleToggleSelectAll(e.target.checked)}
                        type="checkbox"
                    />
                    Select all
                </label>
                {hasSelections && (
                    <button
                        className="inline-flex rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white"
                        disabled={unsaveSelectedMutation.isPending}
                        onClick={handleUnsaveSelected}
                        type="button"
                    >
                        {unsaveSelectedMutation.isPending
                            ? 'Unsaving...'
                            : `Unsave selected pokemon (${selectedPokemonIds.size})`}
                    </button>
                )}
            </div>
            {unsaveSelectedMutation.error && (
                <div className="text-sm text-red-500">
                    Failed to unsave selected Pokemon.
                </div>
            )}

            {isLoading && (
                <div className="text-sm text-muted-foreground">Loading collection...</div>
            )}
            {error && (
                <div className="text-sm text-red-500">
                    Failed to load collection from external API.
                </div>
            )}

            {!isLoading && !error && filteredPokemon.length === 0 && (
                <div className="text-sm text-muted-foreground">
                    No Pokemon in collection.
                </div>
            )}

            <div className="space-y-3">
                {filteredPokemon.map((pokemon: Pokemon) => (
                    <Card className="flex-row items-center justify-between gap-4 px-4 py-3" key={pokemon.id}>
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                            <label className="inline-flex items-center">
                                <input
                                    checked={selectedPokemonIds.has(pokemon.id)}
                                    onChange={e =>
                                        togglePokemonSelection(
                                            pokemon.id,
                                            e.target.checked
                                        )
                                    }
                                    type="checkbox"
                                />
                            </label>
                            <div className="min-w-0">
                                <div className="truncate text-base font-semibold">
                                    {pokemon.name}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {pokemon.types.map(type => (
                                        <Badge className={getTypeColor(type)} key={type}>
                                            {type}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            HP {pokemon.hp} / ATK {pokemon.attack}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
