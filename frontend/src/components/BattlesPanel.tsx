'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react'

import type { BattleEvent } from '@/lib/api/battles'

import { useBattleStream } from '@/hooks/useBattleStream'
import { usePokemonAnimations } from '@/hooks/usePokemonAnimations'
import { usePokemonCatalog } from '@/hooks/usePokemonCatalog'
import {
    createBattle,
    type CreateBattleRequest,
    listBattles
} from '@/lib/api/battles'
import {
    createIdempotencyKey,
    getNextSelectedBattleId
} from '@/lib/battleUtils'

import { BattleArena } from './BattleArena'
import { BattleEventsList } from './BattleEventsList'
import { BattleSelector } from './BattleSelector'
import { PokemonSelectors } from './PokemonSelectors'
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

    const handleBattleEvents = useCallback(
        (incomingEvents: BattleEvent[]) => {
            for (const event of incomingEvents) {
                const actorId = event.actor_pokemon_id
                if (!actorId) continue
                triggerAnimation(actorId)
            }
        },
        [triggerAnimation]
    )

    const handleStreamDone = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ['battles'] })
    }, [queryClient])

    const { appendEventsForBattle, eventsByBattleId, isStreaming, streamError } =
        useBattleStream({
            onBattleEvents: handleBattleEvents,
            onStreamDone: handleStreamDone,
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
        const events = selectedBattleId
            ? (eventsByBattleId[selectedBattleId] ?? [])
            : []
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

    const leftName = leftId
        ? (pokemonById.get(leftId)?.name ?? 'Pokemon 1')
        : 'Pokemon 1'
    const rightName = rightId
        ? (pokemonById.get(rightId)?.name ?? 'Pokemon 2')
        : 'Pokemon 2'

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
                                    Select two pokemon to start a battle!
                                </DialogDescription>
                            </DialogHeader>
                            <form className="space-y-4" onSubmit={handleCreateBattleSubmit}>
                                <PokemonSelectors
                                    pokemon1Input={pokemon1Input}
                                    pokemon2Input={pokemon2Input}
                                    setPokemon1Input={setPokemon1Input}
                                    setPokemon2Input={setPokemon2Input}
                                />
                                {createFormError ? (
                                    <div className="text-sm text-red-500">{createFormError}</div>
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
                                        {createBattleMutation.isPending ? 'Creating...' : 'Create'}
                                    </button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
                <BattleSelector
                    battles={sortedBattles}
                    isLoading={isBattlesLoading}
                    selectedBattleExists={selectedBattleExists}
                    selectedBattleId={selectedBattleId}
                    setSelectedBattleId={setSelectedBattleId}
                />
            </div>
            <BattleArena
                animatingIds={animatingIds}
                leftId={leftId}
                leftIsWinner={leftIsWinner}
                leftName={leftName}
                rightId={rightId}
                rightIsWinner={rightIsWinner}
                rightName={rightName}
            />
            <BattleEventsList
                events={latestEvents}
                hasError={!!(battlesError ?? streamError ?? createBattleMutation.error)}
                isLoading={isBattlesLoading || isStreaming}
            />
        </div>
    )
}
