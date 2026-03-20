import { useCallback, useEffect, useRef, useState } from "react"

export function usePokemonAnimations() {
    const [animatingIds, setAnimatingIds] = useState<Set<number>>(new Set())
    const timeoutIdsRef = useRef<number[]>([])

    const triggerAnimation = useCallback((pokemonId: number) => {
        setAnimatingIds(prev => {
            const next = new Set(prev)
            next.add(pokemonId)
            return next
        })

        const timeoutId = window.setTimeout(() => {
            setAnimatingIds(prev => {
                const next = new Set(prev)
                next.delete(pokemonId)
                return next
            })
        }, 600)

        timeoutIdsRef.current.push(timeoutId)
    }, [])

    useEffect(() => {
        return () => {
            for (const timeoutId of timeoutIdsRef.current) {
                clearTimeout(timeoutId)
            }
            timeoutIdsRef.current = []
        }
    }, [])

    return { animatingIds, triggerAnimation }
}