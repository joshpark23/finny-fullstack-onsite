import { useQuery } from '@tanstack/react-query'

import { fetchPokemonCollection } from '@/lib/api/pokemon'

export function usePokemonCollection() {
    return useQuery({
        queryFn: fetchPokemonCollection,
        queryKey: ['pokemon-collection'] as const
    })
}
