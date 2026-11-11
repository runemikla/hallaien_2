import type { SupabaseClient } from '@supabase/supabase-js'

export type ChatAssistant = {
    id: string
    name: string
    avatar_url: string | null
    system_instruction: string
    voice: string
}

const COLUMNS = 'id, name, avatar_url, system_instruction, voice, teacher_id'

/**
 * Returns the assistant if the user may talk to it: the owning teacher,
 * a student with an active share code, or a student in one of the
 * assistant's utdanningsprogram. Otherwise null.
 */
export async function getAccessibleAssistant(
    supabase: SupabaseClient,
    userId: string,
    assistantId: string,
): Promise<ChatAssistant | null> {
    // Owner
    const { data: owned } = await supabase
        .from('assistants')
        .select(COLUMNS)
        .eq('id', assistantId)
        .eq('teacher_id', userId)
        .maybeSingle()
    if (owned) return owned as ChatAssistant

    // Share code access
    const { data: shareAccess } = await supabase
        .from('student_access')
        .select(`id, assistant:assistants(${COLUMNS})`)
        .eq('student_id', userId)
        .eq('assistant_id', assistantId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()
    if (shareAccess?.assistant) return shareAccess.assistant as unknown as ChatAssistant

    // Utdanningsprogram access
    const { data: userPrograms } = await supabase
        .from('profile_utdanningsprogram')
        .select('utdanningsprogram_id')
        .eq('profile_id', userId)
    const programIds = userPrograms?.map(p => p.utdanningsprogram_id) ?? []
    if (programIds.length === 0) return null

    const { data: programAccess } = await supabase
        .from('assistant_utdanningsprogram')
        .select(`utdanningsprogram_id, assistant:assistants(${COLUMNS})`)
        .eq('assistant_id', assistantId)
        .in('utdanningsprogram_id', programIds)
        .limit(1)
        .maybeSingle()

    return (programAccess?.assistant as unknown as ChatAssistant) ?? null
}
