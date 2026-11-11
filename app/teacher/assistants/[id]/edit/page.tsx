import { redirect } from 'next/navigation'
import { AssistantForm } from '@/components/assistant/assistant-form'
import { requireUser } from '@/lib/session'
import { getOwnedAssistant } from '@/lib/db'

type PageProps = {
    params: Promise<{ id: string }>
}

export default async function EditAssistantPage({ params }: PageProps) {
    const { id } = await params
    const user = await requireUser('teacher')

    const assistant = await getOwnedAssistant(user.id, id)
    if (!assistant) {
        redirect('/teacher')
    }

    return (
        <AssistantForm
            assistant={{
                id: assistant.id,
                name: assistant.name,
                description: assistant.description,
                system_instruction: assistant.system_instruction,
                voice: assistant.voice,
                avatar_url: assistant.avatar_url,
            }}
        />
    )
}
