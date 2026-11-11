'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import * as store from '@/lib/db'
import { DEFAULT_VOICE, isValidVoice } from '@/lib/gemini/voices'

export type AssistantFormData = {
    name: string
    system_instruction: string
    voice?: string
    description?: string
    avatar_url?: string
}

const INSTRUCTION_MAX_LENGTH = 20000
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

async function requireTeacher() {
    const user = await getUser()
    if (!user) return { error: 'Ikke innlogget' as const }
    if (user.role !== 'teacher') return { error: 'Bare lærere kan gjøre dette' as const }
    return { user }
}

function parseForm(formData: AssistantFormData): { input?: store.AssistantInput; error?: string } {
    const name = formData.name?.trim()
    const instruction = formData.system_instruction?.trim()
    if (!name) return { error: 'Navn må fylles ut' }
    if (name.length > 100) return { error: 'Navnet kan ikke være lengre enn 100 tegn' }
    if (!instruction) return { error: 'Systeminstruks må fylles ut' }
    if (instruction.length > INSTRUCTION_MAX_LENGTH) {
        return { error: `Systeminstruksen kan ikke være lengre enn ${INSTRUCTION_MAX_LENGTH} tegn` }
    }
    // Only avatars served by this app are accepted as avatar URLs.
    const avatar = formData.avatar_url && /^\/api\/avatars\/[A-Za-z0-9]+$/.test(formData.avatar_url)
        ? formData.avatar_url
        : null
    return {
        input: {
            name,
            description: formData.description?.trim().slice(0, 500) || null,
            system_instruction: instruction,
            voice: isValidVoice(formData.voice) ? formData.voice : DEFAULT_VOICE,
            avatar_url: avatar,
        },
    }
}

/** Stores an avatar that the browser has already resized to a small JPEG. */
export async function uploadAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
    const { user, error } = await requireTeacher()
    if (!user) return { error }

    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return { error: 'Ingen fil valgt' }
    if (!AVATAR_TYPES.includes(file.type)) return { error: 'Kun JPG, PNG eller WebP er tillatt' }
    if (file.size > store.AVATAR_MAX_BYTES) return { error: 'Bildet er for stort' }

    const id = await store.saveAvatar(user.id, Buffer.from(await file.arrayBuffer()), file.type)
    return { url: `/api/avatars/${id}` }
}

export async function createAssistant(formData: AssistantFormData) {
    const { user, error } = await requireTeacher()
    if (!user) return { error }

    const parsed = parseForm(formData)
    if (!parsed.input) return { error: parsed.error }

    const assistant = await store.createAssistant(user.id, parsed.input)
    revalidatePath('/teacher')
    return { success: true, assistant }
}

export async function updateAssistant(id: string, formData: AssistantFormData) {
    const { user, error } = await requireTeacher()
    if (!user) return { error }

    const parsed = parseForm(formData)
    if (!parsed.input) return { error: parsed.error }

    const assistant = await store.updateAssistant(user.id, id, parsed.input)
    if (!assistant) return { error: 'Assistent ikke funnet' }

    revalidatePath('/teacher')
    revalidatePath(`/teacher/assistants/${id}`)
    return { success: true, assistant }
}

export async function deleteAssistant(id: string) {
    const { user, error } = await requireTeacher()
    if (!user) return { error }

    const deleted = await store.deleteAssistant(user.id, id)
    if (!deleted) return { error: 'Assistent ikke funnet' }

    revalidatePath('/teacher')
    redirect('/teacher')
}
