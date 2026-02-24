'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createAssistant, uploadAvatar, getUtdanningsprogram, type AssistantFormData } from '@/app/actions/assistants'
import { ArrowLeft, Loader2, Upload, User } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

type Program = { id: string; code: string; name: string }

export default function NewAssistantPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([])
    const [programs, setPrograms] = useState<Program[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        async function loadPrograms() {
            const result = await getUtdanningsprogram()
            if (result.programs) {
                setPrograms(result.programs)
            }
        }
        loadPrograms()
    }, [])

    function toggleProgram(id: string) {
        setSelectedProgramIds(prev =>
            prev.includes(id)
                ? prev.filter(p => p !== id)
                : [...prev, id]
        )
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
            setAvatarPreview(null)
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
        const data: AssistantFormData = {
            name: formData.get('name') as string,
            elevenlabs_agent_id: formData.get('elevenlabs_agent_id') as string,
            description: formData.get('description') as string || undefined,
            avatar_url: avatarUrl || undefined,
            utdanningsprogram_ids: selectedProgramIds,
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

                            {/* Utdanningsprogram */}
                            <div className="space-y-3">
                                <Label>Utdanningsprogram</Label>
                                <p className="text-sm text-muted-foreground">
                                    Velg hvilke utdanningsprogram denne assistenten skal være tilgjengelig for
                                </p>
                                <div className="flex flex-col gap-3">
                                    {programs.map((program) => (
                                        <div key={program.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`program-${program.id}`}
                                                checked={selectedProgramIds.includes(program.id)}
                                                onCheckedChange={() => toggleProgram(program.id)}
                                            />
                                            <Label
                                                htmlFor={`program-${program.id}`}
                                                className="text-sm font-normal cursor-pointer"
                                            >
                                                {program.code} — {program.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}

                            <Button type="submit" className="w-full" disabled={isLoading || isUploading}>
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
