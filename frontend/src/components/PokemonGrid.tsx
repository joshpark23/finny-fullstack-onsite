'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import type { Pokemon } from '@/lib/api/pokemon'

import { useDebounce } from '@/hooks/useDebounce'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { usePokemonCatalog } from '@/hooks/usePokemonCatalog'
import { savePokemonToCollection } from '@/lib/api/pokemon'
import { getTypeColor } from '@/lib/pokemonUtils'

import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { Input } from './ui/input'

const PAGE_SIZE = 20

export default function PokemonGrid() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)
    const normalizedSearch = debouncedSearch.trim().toLowerCase()

    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
    const [selectedPokemonIds, setSelectedPokemonIds] = useState<Set<number>>(
        new Set()
    )

    const {
        data: allPokemon = [],
        error,
        isFetching,
        isLoading
    } = usePokemonCatalog()

    useEffect(() => {
        setVisibleCount(PAGE_SIZE)
    }, [normalizedSearch])

    const filteredPokemon = useMemo(() => {
        if (!normalizedSearch) return allPokemon

        return allPokemon.filter(pokemon => {
            const name = pokemon.name.toLowerCase()
            const hasType = pokemon.types.some(type =>
                type.toLowerCase().includes(normalizedSearch)
            )
            const statsText = Object.entries(pokemon.stats)
                .map(([key, value]) => `${key}:${String(value)}`)
                .join(' ')
                .toLowerCase()

            return (
                name.includes(normalizedSearch) ||
                hasType ||
                statsText.includes(normalizedSearch)
            )
        })
    }, [allPokemon, normalizedSearch])

    const hasNextPage = visibleCount < filteredPokemon.length
    const pokemon: Pokemon[] = filteredPokemon.slice(0, visibleCount)
    const isFetchingNextPage = isFetching && !isLoading
    const hasSelections = selectedPokemonIds.size > 0
    const allFilteredSelected =
        filteredPokemon.length > 0 &&
        filteredPokemon.every(p => selectedPokemonIds.has(p.id))

    const loadMoreRef = useInfiniteScroll({
        enabled: hasNextPage,
        onLoadMore: () =>
            setVisibleCount(prev =>
                Math.min(prev + PAGE_SIZE, filteredPokemon.length)
            )
    })

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

    const saveSelectedMutation = useMutation({
        mutationFn: (pokemonIds: number[]) => savePokemonToCollection(pokemonIds),
        onSuccess: () => {
            setSelectedPokemonIds(new Set())
            void queryClient.invalidateQueries({
                queryKey: ['pokemon-collection']
            })
        }
    })

    const handleSaveSelected = () => {
        if (!hasSelections || saveSelectedMutation.isPending) return
        saveSelectedMutation.mutate(Array.from(selectedPokemonIds))
    }

    return (
        <div className="space-y-4">
            <div className="sticky top-14 z-10 bg-background">
                <div className="space-y-3">
                    <Input
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, type, or stat"
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
                                className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                                disabled={saveSelectedMutation.isPending}
                                onClick={handleSaveSelected}
                                type="button"
                            >
                                {saveSelectedMutation.isPending
                                    ? 'Saving...'
                                    : `Save selected pokemon (${selectedPokemonIds.size})`}
                            </button>
                        )}
                    </div>
                    {saveSelectedMutation.error && (
                        <div className="text-sm text-red-500">
                            Failed to save selected Pokemon.
                        </div>
                    )}
                </div>
            </div>
            {isLoading && (
                <div className="flex justify-center py-8 text-sm text-muted-foreground">
                    Loading pokemon...
                </div>
            )}
            {error && (
                <div className="flex justify-center py-8 text-sm text-red-500">
                    Failed to load Pokemon from external API.
                </div>
            )}
            <div className="space-y-3 pb-8">
                {pokemon.map((p: Pokemon) => (
                    <Card
                        className="flex-row items-center justify-between gap-4 px-4 py-3"
                        key={p.id}
                    >
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                            <label className="inline-flex items-center">
                                <input
                                    checked={selectedPokemonIds.has(p.id)}
                                    onChange={e =>
                                        togglePokemonSelection(p.id, e.target.checked)
                                    }
                                    type="checkbox"
                                />
                            </label>
                            <div className="min-w-0">
                                <div className="truncate text-base font-semibold">
                                    {p.name}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {p.types.map(type => (
                                        <Badge className={getTypeColor(type)} key={type}>
                                            {type}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            HP {p.hp} / ATK {p.attack}
                        </div>
                    </Card>
                ))}
            </div>
            {!isLoading && !error && filteredPokemon.length === 0 && (
                <div className="flex justify-center pb-8 text-sm text-muted-foreground">
                    No Pokemon match your search.
                </div>
            )}
            <div
                className="flex justify-center items-center h-12"
                ref={loadMoreRef}
            >
                {isFetchingNextPage && (
                    <span className="text-sm text-muted-foreground">
                        Loading more...
                    </span>
                )}
            </div>
        </div>
    )
}