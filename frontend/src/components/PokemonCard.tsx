"use client"

import type { Pokemon } from '@/lib/api/pokemon'

import { PokemonCardHeader } from './PokemonCardHeader'
import { PokemonCardStats } from './PokemonCardStats'
import { Card } from './ui/card'

type PokemonCardProps = {
    expanded: boolean
    onToggle: () => void
    pokemon: Pokemon
}

export default function PokemonCard({ expanded, onToggle, pokemon }: PokemonCardProps) {
    return (
        <Card className="overflow-hidden pt-0 cursor-pointer transition hover:shadow-md h-56 flex flex-col" onClick={onToggle}>
            {!expanded ? (
                <>
                    <div className="h-44 w-full bg-gradient-to-br from-indigo-500 to-cyan-500 px-4 py-3 text-white">
                        <div className="text-xs uppercase opacity-80">Pokemon #{pokemon.id}</div>
                        <div className="mt-2 text-3xl font-semibold">{pokemon.name}</div>
                    </div>
                    <PokemonCardHeader pokemon={pokemon} />
                </>
            ) : (
                <>
                    <PokemonCardHeader pokemon={pokemon} />
                    <div className="w-full h-44 overflow-auto">
                        <PokemonCardStats pokemon={pokemon} />
                    </div>
                </>
            )}
        </Card>
    )
}

