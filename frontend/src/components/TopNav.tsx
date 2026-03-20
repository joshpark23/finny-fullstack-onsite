'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const navItems = [
    { href: '/explore', label: 'Explore' },
    { href: '/collection', label: 'Collection' },
    { href: '/battles', label: 'Battles' }
] as const

export default function TopNav() {
    const pathname = usePathname()

    return (
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
            <nav className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-3">
                {navItems.map(item => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                        <Link
                            className={cn(
                                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            )}
                            href={item.href}
                            key={item.href}
                        >
                            {item.label}
                        </Link>
                    )
                })}
            </nav>
        </header>
    )
}
