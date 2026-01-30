'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateAssistant, deleteAssistant, uploadAvatar, type AssistantFormData } from '@/app/actions/assistants'
import { ArrowLeft, Loader2, Trash2, Upload, User } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type PageProps = {
    params: Promise<{ id: string }>
}

export default function EditAssistantPage({ params }: PageProps) {
    const router = useRouter()
    const [id, setId] = useState<string>('')
    const [assistant, setAssistant] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        params.then(p => {
            setId(p.id)
            fetchAssistant(p.id)
        })
    }, [params])

    async function fetchAssistant(assistantId: string) {
        const supabase = createClient()
        const { data } = await supabase
            .from('assistants')
            .select('*')
            .eq('id', assistantId)
            .single()

        if (data) {
            setAssistant(data)
            if (data.avatar_url) {
                setAvatarUrl(data.avatar_url)
                setAvatarPreview(data.avatar_url)
            }
        }
    }

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        // Show preview immediately
        const reader = new FileReader()
        reader.onload = (e) => {
            setAvatarPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)

        // Upload to Supabase
        setIsUploading(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)

        const result = await uploadAvatar(formData)

        if (result.error) {
            setError(result.error)
            // Revert to old preview if upload fails
            setAvatarPreview(avatarUrl)
        } else if (result.url) {
            setAvatarUrl(result.url)
        }

        setIsUploading(false)
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const data: Partial<AssistantFormData> = {
            name: formData.get('name') as string,
            elevenlabs_agent_id: formData.get('elevenlabs_agent_id') as string,
            description: formData.get('description') as string || undefined,
            avatar_url: avatarUrl || undefined,
        }

        const result = await updateAssistant(id, data)

        if (result.error) {
            setError(result.error)
            setIsLoading(false)
        } else {
            router.push('/teacher')
        }
    }

    async function handleDelete() {
        if (!confirm('Er du sikker på at du vil slette denne assistenten?')) {
            return
        }

        setIsDeleting(true)
        await deleteAssistant(id)
    }

    if (!assistant) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        )
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
                            Rediger assistent
                        </CardTitle>
                        <CardDescription>
                            Oppdater informasjon om assistenten
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Avatar Upload */}
                            <div className="flex flex-col items-center space-y-4">
                                <div
                                    className="relative w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {avatarPreview ? (
                                        <Image
                                            src={avatarPreview}
                                            alt="Avatar preview"
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <User className="w-10 h-10 text-muted-foreground" />
                                    )}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {avatarPreview ? 'Bytt bilde' : 'Last opp avatar'}
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    Maks 1MB. JPG, PNG eller GIF.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Navn på assistent *</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={assistant.name}
                                    placeholder="F.eks. Norsk muntlig øving"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="elevenlabs_agent_id">ElevenLabs Agent ID *</Label>
                                <Input
                                    id="elevenlabs_agent_id"
                                    name="elevenlabs_agent_id"
                                    defaultValue={assistant.elevenlabs_agent_id}
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
                                    defaultValue={assistant.description || ''}
                                    placeholder="Beskriv hva denne assistenten gjør..."
                                    rows={3}
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}

                            <div className="flex gap-4">
                                <Button type="submit" className="flex-1" disabled={isLoading || isDeleting || isUploading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Lagrer...
                                        </>
                                    ) : (
                                        'Lagre endringer'
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={isLoading || isDeleting}
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Sletter...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Slett
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
