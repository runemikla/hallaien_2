import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, KeyRound, User } from 'lucide-react'

export default async function StudentDashboard() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name')
        .eq('id', user.id)
        .single()

    if (profile?.role === 'teacher') {
        redirect('/teacher')
    }

    // Get student's accessible assistants via share codes (time-limited)
    const { data: accessRecords } = await supabase
        .from('student_access')
        .select(`
      id,
      expires_at,
      assistant:assistants(
        id,
        name,
        description,
        avatar_url
      )
    `)
        .eq('student_id', user.id)
        .gt('expires_at', new Date().toISOString())

    // Get student's accessible assistants via utdanningsprogram (permanent)
    const { data: programAssistants } = await supabase
        .from('assistant_utdanningsprogram')
        .select(`
      assistant:assistants(
        id,
        name,
        description,
        avatar_url
      )
    `)
        .in(
            'utdanningsprogram_id',
            (await supabase
                .from('profile_utdanningsprogram')
                .select('utdanningsprogram_id')
                .eq('profile_id', user.id)
            ).data?.map(p => p.utdanningsprogram_id) || []
        )

    // Combine and deduplicate
    type AssistantInfo = { id: string; name: string; description: string | null; avatar_url: string | null }

    const shareCodeAssistants = (accessRecords || [])
        .map(record => ({
            assistant: record.assistant as unknown as AssistantInfo | null,
            expiresAt: record.expires_at,
            source: 'share_code' as const,
        }))
        .filter(r => r.assistant !== null)

    const programBasedAssistants = (programAssistants || [])
        .map(record => ({
            assistant: record.assistant as unknown as AssistantInfo | null,
            expiresAt: null,
            source: 'program' as const,
        }))
        .filter(r => r.assistant !== null)

    // Deduplicate: prefer share_code entry if exists (has expiry info)
    const seenIds = new Set<string>()
    const allAssistants: { assistant: AssistantInfo; expiresAt: string | null; source: 'share_code' | 'program' }[] = []

    for (const entry of shareCodeAssistants) {
        if (entry.assistant && !seenIds.has(entry.assistant.id)) {
            seenIds.add(entry.assistant.id)
            allAssistants.push(entry as { assistant: AssistantInfo; expiresAt: string | null; source: 'share_code' | 'program' })
        }
    }
    for (const entry of programBasedAssistants) {
        if (entry.assistant && !seenIds.has(entry.assistant.id)) {
            seenIds.add(entry.assistant.id)
            allAssistants.push(entry as { assistant: AssistantInfo; expiresAt: string | null; source: 'share_code' | 'program' })
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-[family-name:var(--font-roboto-slab)]">
                            Hei, {profile?.first_name || 'Elev'}!
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Snakk med dine tilgjengelige assistenter
                        </p>
                    </div>
                    <Link href="/student/redeem">
                        <Button>
                            <KeyRound className="w-4 h-4 mr-2" />
                            Tast inn kode
                        </Button>
                    </Link>
                </div>

                {allAssistants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allAssistants.map((entry) => {
                            const assistant = entry.assistant
                            const hoursLeft = entry.expiresAt
                                ? Math.max(0, Math.round((new Date(entry.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))
                                : null

                            return (
                                <Card key={assistant.id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
                                    <CardHeader className="flex-1">
                                        <div className="flex items-start gap-4">
                                            {/* Avatar */}
                                            <div className="relative w-14 h-14 rounded-full bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                {assistant.avatar_url ? (
                                                    <Image
                                                        src={assistant.avatar_url}
                                                        alt={assistant.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <User className="w-7 h-7 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="font-[family-name:var(--font-roboto-slab)]">
                                                    {assistant.name}
                                                </CardTitle>
                                                <CardDescription className="line-clamp-2">
                                                    {assistant.description || 'Ingen beskrivelse'}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {entry.source === 'share_code'
                                                ? `Tilgang utløper om ${hoursLeft} timer`
                                                : 'Tilgjengelig via ditt utdanningsprogram'}
                                        </p>
                                        <Link href={`/student/assistants/${assistant.id}/chat`}>
                                            <Button className="w-full">
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                Start samtale
                                            </Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <Card className="text-center py-12">
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Du har ingen tilgjengelige assistenter akkurat nå.
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                                Be læreren din om en delingskode for å få tilgang til en assistent.
                            </p>
                            <Link href="/student/redeem">
                                <Button>
                                    <KeyRound className="w-4 h-4 mr-2" />
                                    Tast inn kode
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
