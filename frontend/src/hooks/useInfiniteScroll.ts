import { useEffect, useRef } from 'react'

type Options = {
    enabled?: boolean
    onLoadMore: () => void
}

export function useInfiniteScroll({ enabled = true, onLoadMore }: Options) {
    const ref = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!enabled) return

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                onLoadMore()
            }
        })

        const el = ref.current
        if (el) observer.observe(el)

        return () => {
            if (el) observer.unobserve(el)
        }
    }, [enabled, onLoadMore])

    return ref
}