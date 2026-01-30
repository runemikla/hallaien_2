'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { User, LogOut } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface UserMenuProps {
    email: string
    firstName?: string | null
    avatarUrl?: string | null
}

export function UserMenu({ email, firstName, avatarUrl }: UserMenuProps) {
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/auth/login')
    }

    const displayName = firstName || email

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none">
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                        {displayName}
                    </span>
                    <div className="relative w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt="Avatar"
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                        )}
                    </div>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Min profil
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logg ut
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
