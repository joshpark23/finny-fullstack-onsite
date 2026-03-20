export type BattleCreatedResponse = {
    battle_id: string
}

export type BattleDetail = {
    battle_id: string
    completed_at: null | string
    created_at: string
    events: BattleEvent[]
    pokemon1_id: number
    pokemon2_id: number
    status: string
    turns: number
    winner_id: null | number
    winner_name: null | string
}

export type BattleEvent = {
    actor_hp_after: null | number
    actor_pokemon_id: null | number
    created_at: string
    damage: null | number
    event_type: string
    message: string
    sequence: number
    target_hp_after: null | number
    target_pokemon_id: null | number
}

export type BattleSummary = {
    battle_id: string
    completed_at: null | string
    created_at: string
    pokemon1_id: number
    pokemon2_id: number
    status: string
    turns: number
    winner_id: null | number
    winner_name: null | string
}

export type CreateBattleRequest = {
    idempotency_key?: string
    pokemon1_id: number
    pokemon2_id: number
}

export async function createBattle(
    payload: CreateBattleRequest
): Promise<BattleCreatedResponse> {
    const res = await fetch(`${getPokemonApiBaseUrl()}/battles`, {
        body: JSON.stringify(payload),
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST'
    })

    if (!res.ok) {
        throw new Error(`Failed to create battle (${res.status})`)
    }

    return (await res.json()) as BattleCreatedResponse
}

export async function getBattle(battleId: string): Promise<BattleDetail> {
    const res = await fetch(`${getPokemonApiBaseUrl()}/battles/${battleId}`)

    if (!res.ok) {
        throw new Error(`Failed to load battle detail (${res.status})`)
    }

    return (await res.json()) as BattleDetail
}

export function getBattleStreamUrl(battleId: string): string {
    return `${getPokemonApiBaseUrl()}/battles/${battleId}/stream`
}

export async function listBattles(
    limit = 20,
    offset = 0
): Promise<BattleSummary[]> {
    const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset)
    })
    const res = await fetch(`${getPokemonApiBaseUrl()}/battles?${params.toString()}`)

    if (!res.ok) {
        throw new Error(`Failed to load battles (${res.status})`)
    }

    return (await res.json()) as BattleSummary[]
}

function getPokemonApiBaseUrl(): string {
    return (
        process.env.NEXT_PUBLIC_POKEMON_API_BASE_URL ?? 'http://localhost:8000'
    )
}
