import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { VoiceChat } from '@/components/chat/voice-chat'

type PageProps = {
    params: Promise<{ id: string }>
}

export default async function TeacherChatPage({ params }: PageProps) {
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

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <Link href="/teacher" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Tilbake til oversikt
                </Link>

                <VoiceChat
                    agentId={assistant.elevenlabs_agent_id}
                    assistantName={assistant.name}
                    avatarUrl={assistant.avatar_url}
                />
            </div>
        </div>
    )
}
