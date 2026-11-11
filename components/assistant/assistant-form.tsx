'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2, Trash2, Upload, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InstructionFields } from '@/components/assistant/instruction-fields'
import {
    createAssistant,
    updateAssistant,
    deleteAssistant,
    uploadAvatar,
    type AssistantFormData,
} from '@/app/actions/assistants'
import { resizeToAvatar } from '@/lib/resize-image'

type ExistingAssistant = {
    id: string
    name: string
    description: string | null
    system_instruction: string
    voice: string
    avatar_url: string | null
}

/** Create form when `assistant` is omitted, edit form otherwise. */
export function AssistantForm({ assistant }: Readonly<{ assistant?: ExistingAssistant }>) {
    const router = useRouter()
    const isEdit = !!assistant
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(assistant?.avatar_url ?? null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        setError(null)
        try {
            const formData = new FormData()
            formData.append('file', await resizeToAvatar(file))
            const result = await uploadAvatar(formData)
            if (result.error) setError(result.error)
            else if (result.url) setAvatarUrl(result.url)
        } catch {
            setError('Kunne ikke lese bildet. Prøv et annet bilde.')
        }
        setIsUploading(false)
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const data: AssistantFormData = {
            name: formData.get('name') as string,
            system_instruction: formData.get('system_instruction') as string,
            voice: (formData.get('voice') as string) || undefined,
            description: (formData.get('description') as string) || undefined,
            avatar_url: avatarUrl || undefined,
        }

        const result = isEdit ? await updateAssistant(assistant.id, data) : await createAssistant(data)

        if (result.error) {
            setError(result.error)
            setIsLoading(false)
        } else {
            router.push('/teacher')
        }
    }

    async function handleDelete() {
        if (!assistant) return
        if (!confirm('Er du sikker på at du vil slette denne assistenten?')) return

        setIsDeleting(true)
        const result = await deleteAssistant(assistant.id)
        if (result?.error) {
            setError(result.error)
            setIsDeleting(false)
        }
    }

    const busy = isLoading || isDeleting || isUploading

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
                            {isEdit ? 'Rediger assistent' : 'Ny assistent'}
                        </CardTitle>
                        <CardDescription>
                            {isEdit
                                ? 'Oppdater informasjon om assistenten'
                                : 'Lag en talebasert assistent som elevene kan snakke med'}
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
                                    {avatarUrl ? (
                                        <Image src={avatarUrl} alt="Avatar" fill unoptimized className="object-cover" />
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
                                    {avatarUrl ? 'Bytt bilde' : 'Last opp avatar'}
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    Bildet beskjæres til et kvadrat og forminskes automatisk.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Navn på assistent *</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={assistant?.name}
                                    placeholder="F.eks. Norsk muntlig øving"
                                    maxLength={100}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Beskrivelse</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    defaultValue={assistant?.description || ''}
                                    placeholder="Kort tekst elevene ser, f.eks. hva de skal øve på"
                                    maxLength={500}
                                    rows={3}
                                />
                            </div>

                            <InstructionFields
                                defaultInstruction={assistant?.system_instruction}
                                defaultVoice={assistant?.voice}
                            />

                            {error && <p className="text-sm text-destructive">{error}</p>}

                            <div className="flex gap-4">
                                <Button type="submit" className="flex-1" disabled={busy}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            {isEdit ? 'Lagrer...' : 'Oppretter...'}
                                        </>
                                    ) : isEdit ? 'Lagre endringer' : 'Opprett assistent'}
                                </Button>
                                {isEdit && (
                                    <Button type="button" variant="destructive" onClick={handleDelete} disabled={busy}>
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
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
