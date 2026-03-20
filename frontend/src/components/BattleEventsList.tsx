import type { BattleEvent } from '@/lib/api/battles'

import { eventKey } from '@/lib/battleUtils'

import { Card } from './ui/card'

export function BattleEventsList({
    events,
    hasError,
    isLoading
}: {
    events: BattleEvent[]
    hasError: boolean
    isLoading: boolean
}) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold">Battle Events</h2>

            {isLoading ? (
                <div className="text-sm text-muted-foreground">
                    Loading battle events...
                </div>
            ) : null}

            {hasError ? (
                <div className="text-sm text-red-500">
                    Failed to load battle events.
                </div>
            ) : null}

            {!isLoading && !hasError && events.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                    No battle events available yet.
                </div>
            ) : null}

            <div className="space-y-2">
                {events.map(event => (
                    <Card className="gap-2 px-4 py-3" key={eventKey(event)}>
                        <div className="text-sm font-medium">{event.message}</div>
                        <div className="text-xs text-muted-foreground">
                            {event.event_type} • {new Date(event.created_at).toLocaleString()}
                        </div>
                    </Card>
                ))}
            </div>
        </section>
    )
}