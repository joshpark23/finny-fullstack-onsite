import { useQuery } from '@tanstack/react-query'

import { fetchPokemonCatalog } from '@/lib/api/pokemon'

export function usePokemonCatalog() {
    return useQuery({
        queryFn: fetchPokemonCatalog,
        queryKey: ['pokemon-catalog'] as const
    })
}