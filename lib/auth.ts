import NextAuth from 'next-auth'
import type { Provider } from 'next-auth/providers'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { roleForDomain, type Role } from '@/lib/roles'

// Local development only: sign in without Google by typing an e-mail address.
// Never active in production builds.
export const devLoginEnabled =
    process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_LOGIN === 'true'

const providers: Provider[] = [
    Google({
        // Always show the account chooser: many users have both a private
        // and a school Google account in the same browser.
        authorization: { params: { prompt: 'select_account' } },
    }),
]

if (devLoginEnabled) {
    providers.push(
        Credentials({
            id: 'dev',
            name: 'Utviklerinnlogging',
            credentials: { email: { label: 'E-post', type: 'email' } },
            authorize(credentials) {
                const email = String(credentials?.email || '').toLowerCase()
                if (!roleForDomain(email.split('@')[1])) return null
                return { id: `dev-${email}`, email, name: email.split('@')[0] }
            },
        }),
    )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers,
    session: { strategy: 'jwt', maxAge: 12 * 60 * 60 },
    pages: { signIn: '/auth/login', error: '/auth/error' },
    trustHost: true,
    callbacks: {
        signIn({ account, profile }) {
            if (account?.provider === 'dev') return devLoginEnabled
            // `hd` is only set for Google Workspace accounts and is asserted by
            // Google, so it cannot be faked with a private account.
            const hd = typeof profile?.hd === 'string' ? profile.hd : null
            if (!profile?.email_verified || !roleForDomain(hd)) {
                return '/auth/error?error=AccessDenied'
            }
            return true
        },
        jwt({ token, account, profile, user }) {
            if (account?.provider === 'google' && profile) {
                token.uid = profile.sub
                token.role = roleForDomain(profile.hd as string)
            } else if (account?.provider === 'dev' && user?.email) {
                token.uid = user.id
                token.role = roleForDomain(user.email.split('@')[1])
            }
            return token
        },
        session({ session, token }) {
            session.user.id = token.uid as string
            session.user.role = token.role as Role
            return session
        },
    },
})
