import { requireUser, firstName } from '@/lib/session'
import { listAssistantsByTeacher } from '@/lib/db'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, MessageSquare, Share2, Pencil, User } from 'lucide-react'

export default async function TeacherDashboard() {
    const user = await requireUser('teacher')
    const assistants = await listAssistantsByTeacher(user.id)

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-[family-name:var(--font-roboto-slab)]">
                            Hei, {firstName(user) || 'Lærer'}!
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Her er dine KI-assistenter:
                        </p>
                    </div>
                    <Link href="/teacher/assistants/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Ny assistent
                        </Button>
                    </Link>
                </div>

                {assistants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {assistants.map((assistant) => (
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
                                                    unoptimized
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
                                    <div className="flex gap-2">
                                        <Link href={`/teacher/assistants/${assistant.id}/chat`} className="flex-1">
                                            <Button variant="outline" className="w-full" size="sm">
                                                <MessageSquare className="w-4 h-4 mr-1" />
                                                <span className="hidden sm:inline">Snakk</span>
                                            </Button>
                                        </Link>
                                        <Link href={`/teacher/assistants/${assistant.id}/share`} className="flex-1">
                                            <Button variant="outline" className="w-full" size="sm">
                                                <Share2 className="w-4 h-4 mr-1" />
                                                <span className="hidden sm:inline">Del</span>
                                            </Button>
                                        </Link>
                                        <Link href={`/teacher/assistants/${assistant.id}/edit`} className="flex-1">
                                            <Button variant="outline" className="w-full" size="sm">
                                                <Pencil className="w-4 h-4 mr-1" />
                                                <span className="hidden sm:inline">Rediger</span>
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
