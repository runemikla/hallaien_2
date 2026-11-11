'use client'

import { signOut } from 'next-auth/react'
import { User, LogOut } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface UserMenuProps {
    email: string
    name?: string | null
    avatarUrl?: string | null
}

export function UserMenu({ email, name, avatarUrl }: UserMenuProps) {
    const displayName = name || email

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none">
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                        {displayName}
                    </span>
                    <div className="relative w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                        {avatarUrl ? (
                            // Google profile picture; a plain img avoids allow-listing Google's image hosts.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                        )}
                    </div>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal text-muted-foreground truncate">{email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => signOut({ redirectTo: '/auth/login' })}
                    className="cursor-pointer text-destructive focus:text-destructive"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logg ut
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
