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

    // Get student's accessible assistants (via student_access table)
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

                {accessRecords && accessRecords.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {accessRecords.map((record) => {
                            const assistant = record.assistant as unknown as { id: string; name: string; description: string | null; avatar_url: string | null } | null
                            if (!assistant) return null

                            const expiresAt = new Date(record.expires_at)
                            const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)))

                            return (
                                <Card key={record.id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
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
                                            Tilgang utløper om {hoursLeft} timer
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
