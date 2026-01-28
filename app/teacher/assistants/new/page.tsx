'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createAssistant, type AssistantFormData } from '@/app/actions/assistants'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NewAssistantPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const data: AssistantFormData = {
            name: formData.get('name') as string,
            elevenlabs_agent_id: formData.get('elevenlabs_agent_id') as string,
            description: formData.get('description') as string || undefined,
        }

        const result = await createAssistant(data)

        if (result.error) {
            setError(result.error)
            setIsLoading(false)
        } else {
            router.push('/teacher')
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <Link href="/teacher" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Tilbake til oversikt
                </Link>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-[family-name:var(--font-roboto-slab)]">
                            Ny assistent
                        </CardTitle>
                        <CardDescription>
                            Registrer en ElevenLabs-agent som en assistent i systemet
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Navn på assistent *</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="F.eks. Norsk muntlig øving"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="elevenlabs_agent_id">ElevenLabs Agent ID *</Label>
                                <Input
                                    id="elevenlabs_agent_id"
                                    name="elevenlabs_agent_id"
                                    placeholder="F.eks. abc123xyz..."
                                    required
                                />
                                <p className="text-sm text-muted-foreground">
                                    Du finner Agent ID i ElevenLabs-dashbordet under &quot;Conversational AI&quot;
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Beskrivelse</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Beskriv hva denne assistenten gjør..."
                                    rows={3}
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Oppretter...
                                    </>
                                ) : (
                                    'Opprett assistent'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
