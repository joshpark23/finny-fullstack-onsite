"use client"

import type { Pokemon } from '@/lib/api/pokemon'

import { getTypeColor } from '@/lib/pokemonUtils'

import { Badge } from './ui/badge'
import { CardHeader, CardTitle } from './ui/card'

type PokemonCardHeaderProps = {
    pokemon: Pokemon
}

export function PokemonCardHeader({ pokemon }: PokemonCardHeaderProps) {
    return (
        <CardHeader className="h-12 flex items-center px-4 py-2">
            <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{pokemon.name}</CardTitle>
                <div className="flex flex-wrap gap-2">
                    {pokemon.types.map(type => (
                        <Badge className={`${getTypeColor(type)} text-xs px-2 py-0.5`} key={type}>
                            {type}
                        </Badge>
                    ))}
                </div>
            </div>
        </CardHeader>
    )
}