'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { useBattleStream } from '@/hooks/useBattleStream'
import { usePokemonAnimations } from '@/hooks/usePokemonAnimations'
import { usePokemonCatalog } from '@/hooks/usePokemonCatalog'
import {
    createBattle,
    type CreateBattleRequest,
    listBattles
} from '@/lib/api/battles'
import { createIdempotencyKey, eventKey, getNextSelectedBattleId } from '@/lib/battleUtils'

import { PokemonSelectors } from './PokemonSelectors'
import { Card } from './ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from './ui/dialog'



export default function BattlesPanel() {
    const { data: allPokemon = [] } = usePokemonCatalog()

    const pokemonById = useMemo(() => {
        return new Map(allPokemon.map(pokemon => [pokemon.id, pokemon]))
    }, [allPokemon])

    const { animatingIds, triggerAnimation } = usePokemonAnimations()
    const queryClient = useQueryClient()

    const {
        data: battles = [],
        error: battlesError,
        isLoading: isBattlesLoading
    } = useQuery({
        queryFn: () => listBattles(100, 0),
        queryKey: ['battles'] as const
    })

    const sortedBattles = useMemo(() => {
        return [...battles].sort(
            (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    }, [battles])

    const [selectedBattleId, setSelectedBattleId] = useState<null | string>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [pokemon1Input, setPokemon1Input] = useState('')
    const [pokemon2Input, setPokemon2Input] = useState('')
    const [createFormError, setCreateFormError] = useState<null | string>(null)

    const {
        appendEventsForBattle,
        eventsByBattleId,
        isStreaming,
        streamError
    } = useBattleStream({
        onBattleEvents: incomingEvents => {
            for (const event of incomingEvents) {
                const actorId = event.actor_pokemon_id
                if (!actorId) continue
                triggerAnimation(actorId)
            }
        },
        onStreamDone: () => {
            void queryClient.invalidateQueries({ queryKey: ['battles'] })
        },
        selectedBattleId
    })

    const createBattleMutation = useMutation({
        mutationFn: (payload: CreateBattleRequest) => createBattle(payload),
        onSuccess: response => {
            setSelectedBattleId(response.battle_id)
            appendEventsForBattle(response.battle_id, [])
            setCreateFormError(null)
            setIsCreateDialogOpen(false)
            setPokemon1Input('')
            setPokemon2Input('')
            void queryClient.invalidateQueries({ queryKey: ['battles'] })
        }
    })

    useEffect(() => {
        const nextSelectedBattleId = getNextSelectedBattleId({
            createBattleIsPending: createBattleMutation.isPending,
            eventsByBattleId,
            selectedBattleId,
            sortedBattles
        })

        if (nextSelectedBattleId !== selectedBattleId) {
            setSelectedBattleId(nextSelectedBattleId)
        }
    }, [
        createBattleMutation.isPending,
        eventsByBattleId,
        selectedBattleId,
        sortedBattles
    ])

    const latestEvents = useMemo(() => {
        const events = selectedBattleId ? (eventsByBattleId[selectedBattleId] ?? []) : []
        return [...events].sort((a, b) => b.sequence - a.sequence)
    }, [eventsByBattleId, selectedBattleId])

    const selectedBattleExists = sortedBattles.some(
        battle => battle.battle_id === selectedBattleId
    )

    const selectedBattle = sortedBattles.find(
        battle => battle.battle_id === selectedBattleId
    )

    const leftId = selectedBattle?.pokemon1_id ?? null
    const rightId = selectedBattle?.pokemon2_id ?? null
    const winnerId = selectedBattle?.winner_id ?? null

    const leftIsWinner = winnerId !== null && leftId === winnerId
    const rightIsWinner = winnerId !== null && rightId === winnerId

    const leftName = leftId ? (pokemonById.get(leftId)?.name ?? 'Pokemon 1') : 'Pokemon 1'
    const rightName = rightId ? (pokemonById.get(rightId)?.name ?? 'Pokemon 2') : 'Pokemon 2'

    const handleCreateBattleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setCreateFormError(null)

        const pokemon1Id = Number(pokemon1Input)
        const pokemon2Id = Number(pokemon2Input)

        if (!Number.isInteger(pokemon1Id) || !Number.isInteger(pokemon2Id)) {
            setCreateFormError('Please enter valid Pokemon IDs.')
            return
        }

        if (pokemon1Id === pokemon2Id) {
            setCreateFormError('Please choose two different Pokemon IDs.')
            return
        }

        createBattleMutation.mutate({
            idempotency_key: createIdempotencyKey(),
            pokemon1_id: pokemon1Id,
            pokemon2_id: pokemon2Id
        })
    }

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                    <label
                        className="text-sm font-medium text-muted-foreground"
                        htmlFor="selected-battle"
                    >
                        Selected battle
                    </label>
                    <Dialog
                        onOpenChange={open => {
                            setIsCreateDialogOpen(open)
                            if (!open) {
                                setCreateFormError(null)
                            }
                        }}
                        open={isCreateDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <button
                                className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={createBattleMutation.isPending}
                                type="button"
                            >
                                {createBattleMutation.isPending
                                    ? 'Creating battle...'
                                    : 'Create battle'}
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create battle</DialogTitle>
                                <DialogDescription>
                                    Enter two Pokemon IDs to start a battle.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                className="space-y-4"
                                onSubmit={handleCreateBattleSubmit}
                            >
                                <PokemonSelectors
                                    pokemon1Input={pokemon1Input}
                                    pokemon2Input={pokemon2Input}
                                    setPokemon1Input={setPokemon1Input}
                                    setPokemon2Input={setPokemon2Input}
                                />
                                {createFormError ? (
                                    <div className="text-sm text-red-500">
                                        {createFormError}
                                    </div>
                                ) : null}
                                <DialogFooter>
                                    <button
                                        className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent"
                                        onClick={() => setIsCreateDialogOpen(false)}
                                        type="button"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={createBattleMutation.isPending}
                                        type="submit"
                                    >
                                        {createBattleMutation.isPending
                                            ? 'Creating...'
                                            : 'Create'}
                                    </button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                    disabled={isBattlesLoading || sortedBattles.length === 0}
                    id="selected-battle"
                    onChange={event => setSelectedBattleId(event.target.value)}
                    value={selectedBattleId ?? ''}
                >
                    {selectedBattleId && !selectedBattleExists ? (
                        <option value={selectedBattleId}>
                            {`${selectedBattleId} • Newly created`}
                        </option>
                    ) : null}
                    {sortedBattles.map(battle => (
                        <option key={battle.battle_id} value={battle.battle_id}>
                            {`Status: ${battle.status} • Winner: ${battle.winner_name} • ${new Date(battle.created_at).toLocaleString()}`}
                        </option>
                    ))}
                </select>
            </div>

            <div className="rounded-xl border bg-muted p-6">
                <div className="h-56 w-full rounded-lg bg-transparent">
                    <div className="grid h-56 grid-cols-2 gap-6">
                        <div
                            className={`flex items-center justify-center rounded-lg p-4 transition-colors ${leftIsWinner ? 'border border-green-300 bg-green-50' : ''
                                }`}
                        >
                            <div className="flex items-center justify-center">
                                <div
                                    className={`flex h-36 w-36 items-center justify-center rounded-full bg-white px-3 text-center text-base font-semibold shadow-md transition-transform duration-300 ${leftId && animatingIds.has(leftId)
                                        ? 'translate-x-10 -translate-y-4 scale-110'
                                        : ''
                                        }`}
                                >
                                    {leftName}
                                </div>
                            </div>
                        </div>

                        <div
                            className={`flex items-center justify-center rounded-lg p-4 transition-colors ${rightIsWinner ? 'border border-green-300 bg-green-50' : ''
                                }`}
                        >
                            <div className="flex items-center justify-center">
                                <div
                                    className={`flex h-36 w-36 items-center justify-center rounded-full bg-white px-3 text-center text-base font-semibold shadow-md transition-transform duration-300 ${rightId && animatingIds.has(rightId)
                                        ? '-translate-x-10 -translate-y-4 scale-110'
                                        : ''
                                        }`}
                                >
                                    {rightName}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Battle Events</h2>

                {isBattlesLoading || isStreaming ? (
                    <div className="text-sm text-muted-foreground">
                        Loading battle events...
                    </div>
                ) : null}

                {battlesError || streamError || createBattleMutation.error ? (
                    <div className="text-sm text-red-500">
                        Failed to load battle events.
                    </div>
                ) : null}

                {!isBattlesLoading &&
                    !isStreaming &&
                    !battlesError &&
                    !streamError &&
                    latestEvents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        No battle events available yet.
                    </div>
                ) : null}

                <div className="space-y-2">
                    {latestEvents.map(event => (
                        <Card className="gap-2 px-4 py-3" key={eventKey(event)}>
                            <div className="text-sm font-medium">{event.message}</div>
                            <div className="text-xs text-muted-foreground">
                                {event.event_type} • {new Date(event.created_at).toLocaleString()}
                            </div>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    )
}



