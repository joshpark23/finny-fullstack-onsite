import { useCallback, useEffect, useRef, useState } from 'react'

import type { BattleEvent } from '@/lib/api/battles'

import { consumeBattleStream, mergeBattleEvents } from '@/lib/battleUtils'

export function useBattleStream({
    onBattleEvents,
    onStreamDone,
    selectedBattleId
}: {
    onBattleEvents?: (events: BattleEvent[]) => void
    onStreamDone?: () => void
    selectedBattleId: null | string
}) {
    const [eventsByBattleId, setEventsByBattleId] = useState<Record<string, BattleEvent[]>>({})
    const [streamError, setStreamError] = useState<null | string>(null)
    const [isStreaming, setIsStreaming] = useState(false)

    const onBattleEventsRef = useRef(onBattleEvents)
    const onStreamDoneRef = useRef(onStreamDone)
    const streamInstanceRef = useRef(0)

    useEffect(() => {
        onBattleEventsRef.current = onBattleEvents
    }, [onBattleEvents])

    useEffect(() => {
        onStreamDoneRef.current = onStreamDone
    }, [onStreamDone])

    const appendEventsForBattle = useCallback(
        (battleId: string, incomingEvents: BattleEvent[]) => {
            setEventsByBattleId(prev => {
                const merged = mergeBattleEvents(prev[battleId] ?? [], incomingEvents)

                if (merged === prev[battleId]) {
                    return prev
                }

                return {
                    ...prev,
                    [battleId]: merged
                }
            })
        },
        []
    )

    useEffect(() => {
        if (!selectedBattleId) {
            setIsStreaming(false)
            setStreamError(null)
            return
        }

        const battleId = selectedBattleId
        const abortController = new AbortController()
        const streamInstance = ++streamInstanceRef.current

        setIsStreaming(true)
        setStreamError(null)

        void consumeBattleStream({
            battleId,
            onBattleEvents: incomingEvents => {
                if (streamInstanceRef.current !== streamInstance) return
                appendEventsForBattle(battleId, incomingEvents)
                onBattleEventsRef.current?.(incomingEvents)
            },
            onError: () => {
                if (streamInstanceRef.current !== streamInstance) return
                setIsStreaming(false)
                setStreamError('Failed to stream battle events.')
            },
            onStreamDone: () => {
                if (streamInstanceRef.current !== streamInstance) return
                setIsStreaming(false)
                onStreamDoneRef.current?.()
            },
            signal: abortController.signal
        })

        return () => {
            abortController.abort()
        }
    }, [appendEventsForBattle, selectedBattleId])

    return {
        appendEventsForBattle,
        eventsByBattleId,
        isStreaming,
        streamError
    }
}