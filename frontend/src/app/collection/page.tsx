import CollectionList from '@/components/CollectionList'

export default function CollectionPage() {
    return (
        <main className="mx-auto max-w-7xl px-6 pb-8 pt-6">
            <h1 className="mb-4 text-2xl font-semibold">Saved Pokemon</h1>
            <CollectionList />
        </main>
    )
}
