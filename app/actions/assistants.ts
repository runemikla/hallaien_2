'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type AssistantFormData = {
    name: string
    elevenlabs_agent_id: string
    description?: string
    avatar_url?: string
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

    if (profile?.role !== 'teacher') {
        return { error: 'Bare lærere kan opprette assistenter' }
    }

    const { data, error } = await supabase
        .from('assistants')
        .insert({
            teacher_id: user.id,
            name: formData.name,
            elevenlabs_agent_id: formData.elevenlabs_agent_id,
            description: formData.description || null,
            avatar_url: formData.avatar_url || null,
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
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

    const { data, error } = await supabase
        .from('assistants')
        .update({
            name: formData.name,
            elevenlabs_agent_id: formData.elevenlabs_agent_id,
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
