'use server'

import { revalidatePath } from 'next/cache'
import { getUser } from '@/lib/session'
import * as store from '@/lib/db'

export async function generateShareCode(assistantId: string) {
    const user = await getUser()
    if (!user) return { error: 'Ikke innlogget' }
    if (user.role !== 'teacher') return { error: 'Bare lærere kan dele assistenter' }

    const shareCode = await store.createShareCode(user.id, assistantId)
    if (!shareCode) return { error: 'Assistent ikke funnet' }

    revalidatePath(`/teacher/assistants/${assistantId}/share`)
    return { success: true, shareCode }
}

export async function redeemShareCode(code: string) {
    const user = await getUser()
    if (!user) return { error: 'Ikke innlogget' }

    const assistantId = await store.redeemShareCode(user.id, String(code ?? ''))
    if (!assistantId) return { error: 'Ugyldig eller utløpt kode' }

    revalidatePath('/student')
    return { success: true, assistantId }
}
