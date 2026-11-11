import Link from 'next/link'
import Image from 'next/image'
import { UserMenu } from '@/components/user-menu'
import type { SessionUser } from '@/lib/session'

export function AppHeader({ user, home }: Readonly<{ user: SessionUser; home: string }>) {
    return (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href={home} className="flex items-center gap-3">
                    <Image
                        src="/VLFK/VLFK-logo.png"
                        alt="Vestland fylkeskommune"
                        width={100}
                        height={32}
                        className="h-8 w-auto"
                    />
                </Link>

                <UserMenu email={user.email} name={user.name} avatarUrl={user.image} />
            </div>
        </header>
    )
}
