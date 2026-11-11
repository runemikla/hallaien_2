'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { DEFAULT_VOICE, isValidVoice } from '@/lib/gemini/voices'

const INSTRUCTION_MAX_LENGTH = 20000

function validateInstruction(text: string | undefined): string | null {
    if (!text || !text.trim()) return 'Systeminstruks må fylles ut'
    if (text.length > INSTRUCTION_MAX_LENGTH) return `Systeminstruksen kan ikke være lengre enn ${INSTRUCTION_MAX_LENGTH} tegn`
    return null
}

export type AssistantFormData = {
    name: string
    system_instruction: string
    voice?: string
    description?: string
    avatar_url?: string
    utdanningsprogram_ids?: string[]
}

export async function uploadAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Ikke innlogget' }
    }

    const file = formData.get('file') as File
    if (!file || file.size === 0) {
        return { error: 'Ingen fil valgt' }
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        return { error: 'Kun bildefiler er tillatt' }
    }

    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
        return { error: 'Bildet kan ikke være større enn 1MB' }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        })

    if (uploadError) {
        console.error('Upload error:', uploadError)
        return { error: 'Kunne ikke laste opp bilde: ' + uploadError.message }
    }

    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

    return { url: publicUrl }
}

export async function getUtdanningsprogram() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('utdanningsprogram_table')
        .select('id, code, name')
        .order('code')

    if (error) {
        return { error: error.message, programs: [] }
    }

    return { programs: data }
}

export async function createAssistant(formData: AssistantFormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Ikke innlogget' }
    }

    // Verify user is a teacher
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
        return { error: 'Bare lærere kan opprette assistenter' }
    }

    const instructionError = validateInstruction(formData.system_instruction)
    if (instructionError) {
        return { error: instructionError }
    }

    const { data, error } = await supabase
        .from('assistants')
        .insert({
            teacher_id: user.id,
            name: formData.name,
            system_instruction: formData.system_instruction.trim(),
            voice: isValidVoice(formData.voice) ? formData.voice : DEFAULT_VOICE,
            description: formData.description || null,
            avatar_url: formData.avatar_url || null,
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    // Insert utdanningsprogram links
    if (formData.utdanningsprogram_ids && formData.utdanningsprogram_ids.length > 0) {
        const links = formData.utdanningsprogram_ids.map(programId => ({
            assistant_id: data.id,
            utdanningsprogram_id: programId,
        }))

        const { error: linkError } = await supabase
            .from('assistant_utdanningsprogram')
            .insert(links)

        if (linkError) {
            console.error('Error linking utdanningsprogram:', linkError)
        }
    }

    revalidatePath('/teacher')
    return { success: true, assistant: data }
}

export async function updateAssistant(id: string, formData: Partial<AssistantFormData>) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Ikke innlogget' }
    }

    const instructionError = validateInstruction(formData.system_instruction)
    if (instructionError) {
        return { error: instructionError }
    }

    const { data, error } = await supabase
        .from('assistants')
        .update({
            name: formData.name,
            system_instruction: formData.system_instruction!.trim(),
            voice: isValidVoice(formData.voice) ? formData.voice : DEFAULT_VOICE,
            description: formData.description || null,
            avatar_url: formData.avatar_url || null,
        })
        .eq('id', id)
        .eq('teacher_id', user.id)
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    // Update utdanningsprogram links: delete all, re-insert
    if (formData.utdanningsprogram_ids !== undefined) {
        await supabase
            .from('assistant_utdanningsprogram')
            .delete()
            .eq('assistant_id', id)

        if (formData.utdanningsprogram_ids.length > 0) {
            const links = formData.utdanningsprogram_ids.map(programId => ({
                assistant_id: id,
                utdanningsprogram_id: programId,
            }))

            const { error: linkError } = await supabase
                .from('assistant_utdanningsprogram')
                .insert(links)

            if (linkError) {
                console.error('Error updating utdanningsprogram links:', linkError)
            }
        }
    }

    revalidatePath('/teacher')
    revalidatePath(`/teacher/assistants/${id}`)
    return { success: true, assistant: data }
}

export async function deleteAssistant(id: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Ikke innlogget' }
    }

    const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('id', id)
        .eq('teacher_id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/teacher')
    redirect('/teacher')
}

export async function getMyAssistants() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Ikke innlogget', assistants: [] }
    }

    const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        return { error: error.message, assistants: [] }
    }

    return { assistants: data }
}

export async function getAssistantUtdanningsprogram(assistantId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('assistant_utdanningsprogram')
        .select('utdanningsprogram_id')
        .eq('assistant_id', assistantId)

    if (error) {
        return { error: error.message, programIds: [] }
    }

    return { programIds: data.map(d => d.utdanningsprogram_id) }
}
