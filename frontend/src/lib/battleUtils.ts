import type { BattleEvent } from "./api/battles";

import { getBattleStreamUrl } from "./api/battles"

export type SseMessage = {
    data: string
    eventType: null | string
}

export async function consumeBattleStream({
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
        const response = await fetch(getBattleStreamUrl(battleId), {
            headers: { Accept: 'text/event-stream' },
            signal
        })

        if (!response.ok || !response.body) {
            throw new Error(`Failed to open stream (${response.status})`)
        }

        const decoder = new TextDecoder()
        const reader = response.body.getReader()
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
            if (message.eventType === 'complete' || message.eventType === 'failed') {
                onStreamDone()
                return
            }

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

export function createIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `battle-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function eventKey(event: BattleEvent): string {
    return `${event.sequence}-${event.created_at}`
}

export function getNextSelectedBattleId({
    createBattleIsPending,
    eventsByBattleId,
    selectedBattleId,
    sortedBattles
}: {
    createBattleIsPending: boolean
    eventsByBattleId: Record<string, BattleEvent[]>
    selectedBattleId: null | string
    sortedBattles: Array<{ battle_id: string }>
}): null | string {
    if (sortedBattles.length === 0) {
        return !createBattleIsPending && !selectedBattleId ? null : selectedBattleId
    }

    if (!selectedBattleId) {
        return sortedBattles[0].battle_id
    }

    const hasSelection = sortedBattles.some(
        battle => battle.battle_id === selectedBattleId
    )
    const hasLocalSelectionState = Object.hasOwn(eventsByBattleId, selectedBattleId)

    if (!hasSelection && !hasLocalSelectionState) {
        return sortedBattles[0].battle_id
    }

    return selectedBattleId
}

export function mergeBattleEvents(
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

export function parseBattleEventsFromStream(data: string): BattleEvent[] {
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

export function parseSseBuffer(
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

export function parseSseMessage(rawMessage: string): null | SseMessage {
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

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError'
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