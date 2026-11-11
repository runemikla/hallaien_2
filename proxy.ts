import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Everything except the landing page and the login flow requires a session.
export const proxy = auth((request) => {
    const { pathname } = request.nextUrl
    const isPublic =
        pathname === '/' ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/api/auth')

    if (!request.auth && !isPublic) {
        if (pathname.startsWith('/api')) {
            return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
        }
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        url.search = ''
        return NextResponse.redirect(url)
    }
    return NextResponse.next()
})

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
