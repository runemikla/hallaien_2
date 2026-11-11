import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import type { Role } from '@/lib/roles'

export type SessionUser = {
    id: string
    role: Role
    email: string
    name: string | null
    image: string | null
}

/** The signed-in user, or null. */
export async function getUser(): Promise<SessionUser | null> {
    const session = await auth()
    const user = session?.user
    if (!user?.id || !user.role) return null
    return {
        id: user.id,
        role: user.role,
        email: user.email || '',
        name: user.name || null,
        image: user.image || null,
    }
}

/** For pages: redirects to login, or to the user's own area if the role is wrong. */
export async function requireUser(role?: Role): Promise<SessionUser> {
    const user = await getUser()
    if (!user) redirect('/auth/login')
    if (role && user.role !== role) redirect(user.role === 'teacher' ? '/teacher' : '/student')
    return user
}

export function firstName(user: SessionUser): string | null {
    return user.name?.split(' ')[0] || null
}
