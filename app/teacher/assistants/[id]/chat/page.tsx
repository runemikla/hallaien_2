import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { VoiceChat } from '@/components/chat/voice-chat'
import { requireUser } from '@/lib/session'
import { getOwnedAssistant } from '@/lib/db'

type PageProps = {
    params: Promise<{ id: string }>
}

export default async function TeacherChatPage({ params }: PageProps) {
    const { id } = await params
    const user = await requireUser('teacher')

    const assistant = await getOwnedAssistant(user.id, id)
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
                    assistantId={assistant.id}
                    assistantName={assistant.name}
                    avatarUrl={assistant.avatar_url}
                />
            </div>
        </div>
    )
}
