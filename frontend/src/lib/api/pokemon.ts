export type ExternalPokemonResponse = {
    pokemon_id: number
    pokemon_name: string
    stats: PokemonStats
    types: string[]
}

export type Pokemon = {
    attack: number
    defense: number
    description: string
    generation: number
    hp: number
    id: number
    imageUrl: null | string
    name: string
    specialAttack: number
    specialDefense: number
    speed: number
    stats: PokemonStats
    types: string[]
}

type PokemonStats = Record<string, null | number | string>

export async function fetchPokemonCatalog(): Promise<Pokemon[]> {
    const res = await fetch(`${getPokemonApiBaseUrl()}/pokemon`)

    if (!res.ok) {
        throw new Error(`Failed to fetch pokemon (${res.status})`)
    }

    const data = (await res.json()) as ExternalPokemonResponse[]
    return data.map(mapExternalPokemon)
}

export async function fetchPokemonCollection(): Promise<Pokemon[]> {
    const res = await fetch(`${getPokemonApiBaseUrl()}/collection`)

    if (!res.ok) {
        throw new Error(`Failed to fetch collection (${res.status})`)
    }

    const data = (await res.json()) as ExternalPokemonResponse[]
    return data.map(mapExternalPokemon)
}

export function mapExternalPokemon(pokemon: ExternalPokemonResponse): Pokemon {
    return {
        attack: asNumber(pokemon.stats, ['attack', 'atk']),
        defense: asNumber(pokemon.stats, ['defense', 'def']),
        description: buildDescription(pokemon.types, pokemon.stats),
        generation: asNumber(pokemon.stats, ['generation', 'gen'], 0),
        hp: asNumber(pokemon.stats, ['hp', 'health_points']),
        id: pokemon.pokemon_id,
        imageUrl: null,
        name: pokemon.pokemon_name,
        specialAttack: asNumber(pokemon.stats, [
            'special_attack',
            'specialAttack',
            'sp_atk'
        ]),
        specialDefense: asNumber(pokemon.stats, [
            'special_defense',
            'specialDefense',
            'sp_def'
        ]),
        speed: asNumber(pokemon.stats, ['speed', 'spd']),
        stats: pokemon.stats,
        types: pokemon.types
    }
}

export async function removePokemonFromCollection(
    pokemonIds: number[]
): Promise<void> {
    const res = await fetch(`${getPokemonApiBaseUrl()}/collection`, {
        body: JSON.stringify({ pokemon_ids: pokemonIds }),
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'DELETE'
    })

    if (!res.ok) {
        throw new Error(`Failed to remove from collection (${res.status})`)
    }
}

export async function savePokemonToCollection(
    pokemonIds: number[]
): Promise<Pokemon[]> {
    const res = await fetch(`${getPokemonApiBaseUrl()}/collection`, {
        body: JSON.stringify({ pokemon_ids: pokemonIds }),
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST'
    })

    if (!res.ok) {
        throw new Error(`Failed to save collection (${res.status})`)
    }

    const data = (await res.json()) as ExternalPokemonResponse[]
    return data.map(mapExternalPokemon)
}

function asNumber(
    stats: PokemonStats,
    keys: string[],
    fallback = 0
): number {
    for (const key of keys) {
        const value = stats[key]
        if (typeof value === 'number' && Number.isFinite(value)) return value
        if (typeof value === 'string') {
            const parsed = Number(value)
            if (Number.isFinite(parsed)) return parsed
        }
    }

    return fallback
}

function buildDescription(types: string[], stats: PokemonStats): string {
    const hp = asNumber(stats, ['hp', 'health_points'])
    const attack = asNumber(stats, ['attack', 'atk'])
    const defense = asNumber(stats, ['defense', 'def'])
    const typeText = types.length > 0 ? types.join(', ') : 'Unknown'

    return `${typeText} Pokemon with ${hp} HP, ${attack} ATK, ${defense} DEF.`
}

function getPokemonApiBaseUrl(): string {
    return (
        process.env.NEXT_PUBLIC_POKEMON_API_BASE_URL ?? 'http://localhost:8000'
    )
}