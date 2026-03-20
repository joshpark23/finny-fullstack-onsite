import PokemonGrid from '@/components/PokemonGrid'

export default function ExplorePage() {
    return (
        <main className="mx-auto max-w-7xl px-6 pb-8 pt-6">
            <h1 className="mb-4 text-2xl font-semibold">Explore Pokemon</h1>
            <PokemonGrid />
        </main>
    )
}
