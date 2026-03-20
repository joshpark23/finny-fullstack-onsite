'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import { usePokemonCatalog } from '@/hooks/usePokemonInfinite'
import {
    type BattleEvent,
    createBattle,
    type CreateBattleRequest,
    getBattleStreamUrl,
    listBattles
} from '@/lib/api/battles'

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

type SseMessage = {
    data: string
    eventType: null | string
}

export default function BattlesPanel() {
    const {
        data: allPokemon = []
    } = usePokemonCatalog()

    const [animatingIds, setAnimatingIds] = useState<Set<number>>(new Set())
    const animationTimeoutsRef = useRef<number[]>([])

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
    const [eventsByBattleId, setEventsByBattleId] = useState<Record<string, BattleEvent[]>>({})
    const [streamError, setStreamError] = useState<null | string>(null)
    const [isStreaming, setIsStreaming] = useState(false)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [pokemon1Input, setPokemon1Input] = useState('')
    const [pokemon2Input, setPokemon2Input] = useState('')
    const [createFormError, setCreateFormError] = useState<null | string>(null)

    const createBattleMutation = useMutation({
        mutationFn: (payload: CreateBattleRequest) => createBattle(payload),
        onSuccess: response => {
            setSelectedBattleId(response.battle_id)
            setEventsByBattleId(prev => ({
                ...prev,
                [response.battle_id]: []
            }))
            setCreateFormError(null)
            setIsCreateDialogOpen(false)
            setPokemon1Input('')
            setPokemon2Input('')
            void queryClient.invalidateQueries({ queryKey: ['battles'] })
        }
    })

    useEffect(() => {
        if (sortedBattles.length === 0) {
            if (!createBattleMutation.isPending && !selectedBattleId) {
                setSelectedBattleId(null)
            }
            return
        }

        const hasSelection = sortedBattles.some(
            battle => battle.battle_id === selectedBattleId
        )
        const hasLocalSelectionState = selectedBattleId
            ? Object.hasOwn(eventsByBattleId, selectedBattleId)
            : false

        if (!selectedBattleId) {
            setSelectedBattleId(sortedBattles[0].battle_id)
            return
        }

        if (!hasSelection && !hasLocalSelectionState) {
            setSelectedBattleId(sortedBattles[0].battle_id)
        }
    }, [
        createBattleMutation.isPending,
        eventsByBattleId,
        selectedBattleId,
        sortedBattles
    ])

    useEffect(() => {
        if (!selectedBattleId) return

        setIsStreaming(true)
        setStreamError(null)
        const battleId = selectedBattleId
        const abortController = new AbortController()

        void consumeBattleStream({
            battleId,
            onBattleEvents: incomingEvents => {
                setEventsByBattleId(prev => ({
                    ...prev,
                    [battleId]: mergeBattleEvents(prev[battleId] ?? [], incomingEvents)
                }))


                // Trigger jump animation for event actors
                for (const ev of incomingEvents) {
                    const actor = ev.actor_pokemon_id
                    if (!actor) continue
                    setAnimatingIds(prev => {
                        const next = new Set(prev)
                        next.add(actor)
                        return next
                    })

                    const t = window.setTimeout(() => {
                        setAnimatingIds(prev => {
                            const next = new Set(prev)
                            next.delete(actor)
                            return next
                        })
                    }, 600)
                    animationTimeoutsRef.current.push(t)
                }
            },
            onError: () => {
                setIsStreaming(false)
                setStreamError('Failed to stream battle events.')
            },
            onStreamDone: () => {
                setIsStreaming(false)
                void queryClient.invalidateQueries({ queryKey: ['battles'] })
            },
            signal: abortController.signal
        })

        return () => {
            abortController.abort()
            // clear pending animation timeouts when stream stops or component unmounts
            for (const t of animationTimeoutsRef.current) {
                clearTimeout(t)
            }
            animationTimeoutsRef.current = []
        }
    }, [queryClient, selectedBattleId])

    const latestEvents = useMemo(() => {
        const events = selectedBattleId ? (eventsByBattleId[selectedBattleId] ?? []) : []
        return [...events].sort((a, b) => b.sequence - a.sequence)
    }, [eventsByBattleId, selectedBattleId])

    const selectedBattleExists = sortedBattles.some(
        battle => battle.battle_id === selectedBattleId
    )

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

    const selectedBattle = sortedBattles.find(b => b.battle_id === selectedBattleId)
    const leftId = selectedBattle?.pokemon1_id ?? null
    const rightId = selectedBattle?.pokemon2_id ?? null
    const winnerId = selectedBattle?.winner_id ?? null

    const leftIsWinner = winnerId !== null && leftId === winnerId
    const rightIsWinner = winnerId !== null && rightId === winnerId

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
                                {/* Pokemon selectors: populated from catalog */}
                                <PokemonSelectors
                                    pokemon1Input={pokemon1Input}
                                    pokemon2Input={pokemon2Input}
                                    setPokemon1Input={setPokemon1Input}
                                    setPokemon2Input={setPokemon2Input}
                                />
                                {createFormError && (
                                    <div className="text-sm text-red-500">
                                        {createFormError}
                                    </div>
                                )}
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
                    onChange={e => setSelectedBattleId(e.target.value)}
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
                    <div className="grid grid-cols-2 gap-6 h-56">
                        {/* Left panel */}
                        <div className={`flex items-center justify-center rounded-lg p-4 transition-colors ${leftIsWinner ? 'bg-green-50 border border-green-300' : ''}`}>
                            <div className="flex items-center justify-center">
                                <div
                                    className={`w-36 h-36 rounded-full bg-white shadow-md flex items-center justify-center text-center px-3 text-base font-semibold transition-transform duration-300 ${leftId && animatingIds.has(leftId) ? 'translate-x-10 -translate-y-4 scale-110' : ''
                                        }`}
                                >
                                    {(() => {
                                        const p = allPokemon.find(x => x.id === leftId)
                                        return p ? p.name : 'Pokemon 1'
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Right panel */}
                        <div className={`flex items-center justify-center rounded-lg p-4 transition-colors ${rightIsWinner ? 'bg-green-50 border border-green-300' : ''}`}>
                            <div className="flex items-center justify-center">
                                <div
                                    className={`w-36 h-36 rounded-full bg-white shadow-md flex items-center justify-center text-center px-3 text-base font-semibold transition-transform duration-300 ${rightId && animatingIds.has(rightId) ? '-translate-x-10 -translate-y-4 scale-110' : ''
                                        }`}
                                >
                                    {(() => {
                                        const p = allPokemon.find(x => x.id === rightId)
                                        return p ? p.name : 'Pokemon 2'
                                    })()}
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
                        <Card className="gap-2 px-4 py-3" key={`${event.sequence}-${event.created_at}`}>
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

async function consumeBattleStream({
    battleId,
    onBattleEvents,
    onError,
    onStreamDone,
    signal
}: {
    battleId: string
    onBattleEvents: (events: BattleEvent[]) => void
    onError: () => void
    onStreamDone: () => void
    signal: AbortSignal
}): Promise<void> {
    try {
        const res = await fetch(getBattleStreamUrl(battleId), {
            headers: { Accept: 'text/event-stream' },
            signal
        })

        if (!res.ok || !res.body) {
            throw new Error(`Failed to open stream (${res.status})`)
        }

        const decoder = new TextDecoder()
        const reader = res.body.getReader()
        let buffer = ''

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const { messages, remaining } = parseSseBuffer(buffer)
            buffer = remaining

            for (const message of messages) {
                if (message.eventType === 'complete' || message.eventType === 'failed') {
                    onStreamDone()
                    return
                }

                const incomingEvents = parseBattleEventsFromStream(message.data)
                if (incomingEvents.length > 0) {
                    onBattleEvents(incomingEvents)
                }
            }
        }

        buffer += decoder.decode()
        const { messages } = parseSseBuffer(buffer, true)
        for (const message of messages) {
            const incomingEvents = parseBattleEventsFromStream(message.data)
            if (incomingEvents.length > 0) {
                onBattleEvents(incomingEvents)
            }
        }

        onStreamDone()
    } catch (error) {
        if (isAbortError(error)) {
            return
        }
        onError()
    }
}

function createIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `battle-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function eventKey(event: BattleEvent): string {
    return `${event.sequence}-${event.created_at}`
}

function isAbortError(error: unknown): boolean {
    return (
        error instanceof DOMException && error.name === 'AbortError'
    )
}

function isBattleEvent(value: unknown): value is BattleEvent {
    if (!value || typeof value !== 'object') {
        return false
    }

    const event = value as Partial<BattleEvent>
    return (
        typeof event.sequence === 'number' &&
        typeof event.event_type === 'string' &&
        typeof event.message === 'string' &&
        typeof event.created_at === 'string'
    )
}

function mergeBattleEvents(
    existing: BattleEvent[],
    incoming: BattleEvent[]
): BattleEvent[] {
    const eventMap = new Map<string, BattleEvent>()

    for (const event of existing) {
        eventMap.set(eventKey(event), event)
    }
    for (const event of incoming) {
        eventMap.set(eventKey(event), event)
    }

    return Array.from(eventMap.values())
}

function parseBattleEventsFromStream(data: string): BattleEvent[] {
    try {
        const parsed = JSON.parse(data) as unknown
        if (Array.isArray(parsed)) {
            return parsed.filter(isBattleEvent)
        }
        if (isBattleEvent(parsed)) {
            return [parsed]
        }
        if (parsed && typeof parsed === 'object') {
            const value = parsed as Record<string, unknown>
            if (Array.isArray(value.data)) {
                return value.data.filter(isBattleEvent)
            }
            if (isBattleEvent(value.data)) {
                return [value.data]
            }
            if (isBattleEvent(value.event)) {
                return [value.event]
            }
        }
    } catch {
        return []
    }

    return []
}

function parseSseBuffer(
    buffer: string,
    flush = false
): { messages: SseMessage[]; remaining: string } {
    const normalized = buffer.replaceAll('\r\n', '\n')
    const rawMessages = normalized.split('\n\n')
    const remaining = flush ? '' : (rawMessages.pop() ?? '')
    const messages = rawMessages
        .map(parseSseMessage)
        .filter((message): message is SseMessage => message !== null)

    return { messages, remaining }
}

function parseSseMessage(rawMessage: string): null | SseMessage {
    const lines = rawMessage.split('\n')
    const dataLines: string[] = []
    let eventType: null | string = null

    for (const line of lines) {
        if (!line || line.startsWith(':')) {
            continue
        }
        if (line.startsWith('event:')) {
            eventType = line.slice('event:'.length).trim()
            continue
        }
        if (line.startsWith('data:')) {
            dataLines.push(line.slice('data:'.length).trimStart())
        }
    }

    if (dataLines.length === 0) {
        return null
    }

    return {
        data: dataLines.join('\n'),
        eventType
    }
}

