import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { VoiceChat } from '@/components/chat/voice-chat'

type PageProps = {
    params: Promise<{ id: string }>
}

export default async function StudentChatPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Check access via share code (time-limited)
    const { data: shareAccess } = await supabase
        .from('student_access')
        .select(`
      id,
      expires_at,
      assistant:assistants(
        id,
        name,
        elevenlabs_agent_id,
        avatar_url
      )
    `)
        .eq('student_id', user.id)
        .eq('assistant_id', id)
        .gt('expires_at', new Date().toISOString())
        .single()

    let assistant: {
        id: string
        name: string
        elevenlabs_agent_id: string
        avatar_url: string | null
    } | null = null

    if (shareAccess?.assistant) {
        assistant = shareAccess.assistant as unknown as typeof assistant
    }

    // If no share code access, check via utdanningsprogram
    if (!assistant) {
        const { data: programAccess } = await supabase
            .from('assistant_utdanningsprogram')
            .select(`
          utdanningsprogram_id,
          assistant:assistants(
            id,
            name,
            elevenlabs_agent_id,
            avatar_url
          )
        `)
            .eq('assistant_id', id)
            .in(
                'utdanningsprogram_id',
                (await supabase
                    .from('profile_utdanningsprogram')
                    .select('utdanningsprogram_id')
                    .eq('profile_id', user.id)
                ).data?.map(p => p.utdanningsprogram_id) || []
            )
            .limit(1)
            .single()

        if (programAccess?.assistant) {
            assistant = programAccess.assistant as unknown as typeof assistant
        }
    }

    if (!assistant) {
        redirect('/student')
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <Link href="/student" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
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
