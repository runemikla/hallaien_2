import { NextResponse } from 'next/server'
import { getAvatar } from '@/lib/db'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const avatar = await getAvatar(id)
    if (!avatar) return new NextResponse(null, { status: 404 })

    return new NextResponse(new Uint8Array(avatar.data), {
        headers: {
            'Content-Type': avatar.contentType,
            // Avatars are immutable: a new upload gets a new id.
            'Cache-Control': 'private, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
        },
    })
}
