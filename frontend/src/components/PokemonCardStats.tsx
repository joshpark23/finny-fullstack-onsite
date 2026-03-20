import type { Pokemon } from '@/lib/api/pokemon'

type PokemonCardStatsProps = {
    pokemon: Pokemon
}

export function PokemonCardStats({ pokemon }: PokemonCardStatsProps) {
    const visibleStats = Object.entries(pokemon.stats).filter(([, value]) => value !== null)

    return (
        <div className="p-3 space-y-2 text-sm">
            <p className="text-sm text-muted-foreground">{pokemon.description}</p>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>HP: {pokemon.hp}</div>
                <div>Attack: {pokemon.attack}</div>
                <div>Defense: {pokemon.defense}</div>
                <div>Speed: {pokemon.speed}</div>
                <div>Sp. Attack: {pokemon.specialAttack}</div>
                <div>Sp. Defense: {pokemon.specialDefense}</div>
                <div>Generation: {pokemon.generation}</div>
                <div>ID: {pokemon.id}</div>
            </div>

            <div className="space-y-1 border-t pt-2">
                <div className="text-xs uppercase text-muted-foreground">Raw Stats</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {visibleStats.map(([key, value]) => (
                        <div key={key}>
                            {key}: {String(value)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
