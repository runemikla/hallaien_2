'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadProfileAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
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
    const fileName = `${user.id}/profile.${fileExt}`

    // Delete old avatar if exists
    await supabase.storage
        .from('avatars')
        .remove([`${user.id}/profile.${fileExt}`])

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
        })

    if (uploadError) {
        console.error('Upload error:', uploadError)
        return { error: 'Kunne ikke laste opp bilde: ' + uploadError.message }
    }

    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

    if (updateError) {
        return { error: 'Kunne ikke oppdatere profil: ' + updateError.message }
    }

    revalidatePath('/profile')
    revalidatePath('/teacher')
    revalidatePath('/student')
    return { url: publicUrl }
}

export async function updateProfile(data: { first_name?: string; last_name?: string }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Ikke innlogget' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            first_name: data.first_name || null,
        })
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/profile')
    revalidatePath('/teacher')
    revalidatePath('/student')
    return { success: true }
}

export async function getProfile() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Ikke innlogget', profile: null }
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (error) {
        return { error: error.message, profile: null }
    }

    return { profile, email: user.email }
}

export async function getProfileUtdanningsprogram() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Ikke innlogget', programs: [] }
    }

    const { data, error } = await supabase
        .from('profile_utdanningsprogram')
        .select(`
            utdanningsprogram:utdanningsprogram_table(
                id,
                code,
                name
            )
        `)
        .eq('profile_id', user.id)

    if (error) {
        return { error: error.message, programs: [] }
    }

    const programs = (data || [])
        .map(d => d.utdanningsprogram as unknown as { id: string; code: string; name: string })
        .filter(Boolean)

    return { programs }
}
