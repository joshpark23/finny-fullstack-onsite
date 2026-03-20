type BattleSummary = {
    battle_id: string
    created_at: string
    status: string
    winner_name: null | string
}

export function BattleSelector({
    battles,
    isLoading,
    selectedBattleExists,
    selectedBattleId,
    setSelectedBattleId
}: {
    battles: BattleSummary[]
    isLoading: boolean
    selectedBattleExists: boolean
    selectedBattleId: null | string
    setSelectedBattleId: (battleId: string) => void
}) {
    return (
        <select
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
            disabled={isLoading || battles.length === 0}
            id="selected-battle"
            onChange={event => setSelectedBattleId(event.target.value)}
            value={selectedBattleId ?? ''}
        >
            {selectedBattleId && !selectedBattleExists ? (
                <option value={selectedBattleId}>
                    {`${selectedBattleId} • Newly created`}
                </option>
            ) : null}

            {battles.map(battle => (
                <option key={battle.battle_id} value={battle.battle_id}>
                    {`Status: ${battle.status} • Winner: ${battle.winner_name ?? 'TBD'} • ${new Date(battle.created_at).toLocaleString()}`}
                </option>
            ))}
        </select>
    )
}
