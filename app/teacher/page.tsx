import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, MessageSquare, Share2 } from 'lucide-react'

export default async function TeacherDashboard() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Verify user is a teacher
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'teacher') {
        redirect('/student')
    }

    // Get teacher's assistants
    const { data: assistants } = await supabase
        .from('assistants')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-[family-name:var(--font-roboto-slab)]">
                            Hei, {profile?.first_name || 'Lærer'}!
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Administrer dine KI-assistenter
                        </p>
                    </div>
                    <Link href="/teacher/assistants/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Ny assistent
                        </Button>
                    </Link>
                </div>

                {assistants && assistants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assistants.map((assistant) => (
                            <Card key={assistant.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <CardTitle className="font-[family-name:var(--font-roboto-slab)]">
                                        {assistant.name}
                                    </CardTitle>
                                    <CardDescription>
                                        {assistant.description || 'Ingen beskrivelse'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2">
                                        <Link href={`/teacher/assistants/${assistant.id}/chat`} className="flex-1">
                                            <Button variant="outline" className="w-full">
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                Snakk
                                            </Button>
                                        </Link>
                                        <Link href={`/teacher/assistants/${assistant.id}/share`} className="flex-1">
                                            <Button variant="outline" className="w-full">
                                                <Share2 className="w-4 h-4 mr-2" />
                                                Del
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="text-center py-12">
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Du har ingen assistenter ennå.
                            </p>
                            <Link href="/teacher/assistants/new">
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Opprett din første assistent
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
