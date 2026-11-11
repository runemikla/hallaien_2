import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { VoiceChat } from '@/components/chat/voice-chat'
import { requireUser } from '@/lib/session'
import { getAccessibleAssistant } from '@/lib/db'

type PageProps = {
    params: Promise<{ id: string }>
}

export default async function StudentChatPage({ params }: PageProps) {
    const { id } = await params
    const user = await requireUser()

    // Access via a share code (time-limited)
    const assistant = await getAccessibleAssistant(user, id)
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
                    assistantId={assistant.id}
                    assistantName={assistant.name}
                    avatarUrl={assistant.avatar_url}
                />
            </div>
        </div>
    )
}
