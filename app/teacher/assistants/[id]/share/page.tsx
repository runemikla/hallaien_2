import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ShareCodeGenerator } from '@/components/dashboard/share-code-generator'
import { requireUser } from '@/lib/session'
import { getOwnedAssistant, listActiveShareCodes } from '@/lib/db'

type PageProps = {
    params: Promise<{ id: string }>
}

export default async function ShareAssistantPage({ params }: PageProps) {
    const { id } = await params
    const user = await requireUser('teacher')

    const assistant = await getOwnedAssistant(user.id, id)
    if (!assistant) {
        redirect('/teacher')
    }

    const shareCodes = await listActiveShareCodes(user.id, id)

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <Link href="/teacher" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Tilbake til oversikt
                </Link>

                <ShareCodeGenerator
                    assistant={{ id: assistant.id, name: assistant.name }}
                    existingCodes={shareCodes}
                />
            </div>
        </div>
    )
}
