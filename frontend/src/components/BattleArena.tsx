export function BattleArena({
    animatingIds,
    leftId,
    leftIsWinner,
    leftName,
    rightId,
    rightIsWinner,
    rightName
}: {
    animatingIds: Set<number>
    leftId: null | number
    leftIsWinner: boolean
    leftName: string
    rightId: null | number
    rightIsWinner: boolean
    rightName: string
}) {
    return (
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
    )
}