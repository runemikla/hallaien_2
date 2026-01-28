'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Generate a random 6-character code
function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

export async function generateShareCode(assistantId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Ikke innlogget' }
    }

    // Verify user owns this assistant
    const { data: assistant } = await supabase
        .from('assistants')
        .select('id, teacher_id')
        .eq('id', assistantId)
        .eq('teacher_id', user.id)
        .single()

    if (!assistant) {
        return { error: 'Assistent ikke funnet' }
    }

    // Generate unique code
    let code = generateCode()
    let attempts = 0
    while (attempts < 10) {
        const { data: existing } = await supabase
            .from('share_codes')
            .select('id')
            .eq('code', code)
            .single()

        if (!existing) break
        code = generateCode()
        attempts++
    }

    // Create share code with 24-hour expiry
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const { data, error } = await supabase
        .from('share_codes')
        .insert({
            code,
            assistant_id: assistantId,
            teacher_id: user.id,
            expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/teacher/assistants/${assistantId}/share`)
    return { success: true, shareCode: data }
}

export async function redeemShareCode(code: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Ikke innlogget' }
    }

    // Find valid share code
    const { data: shareCode } = await supabase
        .from('share_codes')
        .select('id, assistant_id, expires_at')
        .eq('code', code.toUpperCase())
        .gt('expires_at', new Date().toISOString())
        .single()

    if (!shareCode) {
        return { error: 'Ugyldig eller utløpt kode' }
    }

    // Check if student already has access
    const { data: existingAccess } = await supabase
        .from('student_access')
        .select('id')
        .eq('student_id', user.id)
        .eq('assistant_id', shareCode.assistant_id)
        .single()

    if (existingAccess) {
        // Update expiry
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)

        await supabase
            .from('student_access')
            .update({ expires_at: expiresAt.toISOString() })
            .eq('id', existingAccess.id)
    } else {
        // Grant new access
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)

        const { error } = await supabase
            .from('student_access')
            .insert({
                student_id: user.id,
                assistant_id: shareCode.assistant_id,
                expires_at: expiresAt.toISOString(),
            })

        if (error) {
            return { error: error.message }
        }
    }

    revalidatePath('/student')
    return { success: true, assistantId: shareCode.assistant_id }
}

export async function getActiveShareCodes(assistantId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Ikke innlogget', codes: [] }
    }

    const { data, error } = await supabase
        .from('share_codes')
        .select('*')
        .eq('assistant_id', assistantId)
        .eq('teacher_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

    if (error) {
        return { error: error.message, codes: [] }
    }

    return { codes: data }
}
