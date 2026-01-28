import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ShareCodeGenerator } from '@/components/dashboard/share-code-generator'

type PageProps = {
    params: Promise<{ id: string }>
}

export default async function ShareAssistantPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get assistant (only if user owns it)
    const { data: assistant } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', id)
        .eq('teacher_id', user.id)
        .single()

    if (!assistant) {
        redirect('/teacher')
    }

    // Get active share codes
    const { data: shareCodes } = await supabase
        .from('share_codes')
        .select('*')
        .eq('assistant_id', id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <Link href="/teacher" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Tilbake til oversikt
                </Link>

                <ShareCodeGenerator
                    assistant={assistant}
                    existingCodes={shareCodes || []}
                />
            </div>
        </div>
    )
}
