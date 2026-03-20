import { useCallback, useEffect, useRef, useState } from "react"

import type { BattleEvent } from "@/lib/api/battles"

import { consumeBattleStream, mergeBattleEvents } from "@/lib/battleUtils"

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

    useEffect(() => {
        onBattleEventsRef.current = onBattleEvents
    }, [onBattleEvents])

    useEffect(() => {
        onStreamDoneRef.current = onStreamDone
    }, [onStreamDone])

    const appendEventsForBattle = useCallback(
        (battleId: string, incomingEvents: BattleEvent[]) => {
            setEventsByBattleId(prev => ({
                ...prev,
                [battleId]: mergeBattleEvents(prev[battleId] ?? [], incomingEvents)
            }))
        },
        []
    )

    useEffect(() => {
        if (!selectedBattleId) return

        const battleId = selectedBattleId
        const abortController = new AbortController()

        setIsStreaming(true)
        setStreamError(null)

        void consumeBattleStream({
            battleId,
            onBattleEvents: incomingEvents => {
                appendEventsForBattle(battleId, incomingEvents)
                onBattleEventsRef.current?.(incomingEvents)
            },
            onError: () => {
                setIsStreaming(false)
                setStreamError('Failed to stream battle events.')
            },
            onStreamDone: () => {
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

