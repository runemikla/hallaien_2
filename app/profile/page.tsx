'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Upload, Loader2, ArrowLeft, Check, Shield, GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { uploadProfileAvatar, updateProfile, getProfile, getProfileUtdanningsprogram } from '@/app/actions/profile'
import Link from 'next/link'

export default function ProfilePage() {
    const router = useRouter()
    const [firstName, setFirstName] = useState('')
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<string>('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [programs, setPrograms] = useState<{ id: string; code: string; name: string }[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        async function loadProfile() {
            const result = await getProfile()
            if (result.error) {
                setError(result.error)
                setIsLoading(false)
                return
            }
            if (result.profile) {
                setFirstName(result.profile.first_name || '')
                setRole(result.profile.role || 'student')
                setAvatarUrl(result.profile.avatar_url)
                setAvatarPreview(result.profile.avatar_url)
            }
            if (result.email) {
                setEmail(result.email)
            }
            setIsLoading(false)
        }
        loadProfile()

        async function loadPrograms() {
            const result = await getProfileUtdanningsprogram()
            if (result.programs) setPrograms(result.programs)
        }
        loadPrograms()
    }, [])

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Show preview immediately
        const reader = new FileReader()
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        // Upload
        setIsUploading(true)
        setError(null)
        const formData = new FormData()
        formData.append('file', file)
        const result = await uploadProfileAvatar(formData)
        setIsUploading(false)

        if (result.error) {
            setError(result.error)
            setAvatarPreview(avatarUrl)
        } else if (result.url) {
            setAvatarUrl(result.url)
            setAvatarPreview(result.url)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        setError(null)
        setSuccess(false)

        const result = await updateProfile({ first_name: firstName })

        setIsSaving(false)

        if (result.error) {
            setError(result.error)
        } else {
            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const canEdit = role === 'teacher' || role === 'admin'

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <Link href={canEdit ? '/teacher' : '/student'} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Tilbake til oversikt
                </Link>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-[family-name:var(--font-roboto-slab)]">
                            Min profil
                        </CardTitle>
                        <CardDescription>
                            {canEdit ? 'Oppdater profilbildet og navnet ditt' : 'Se informasjonen din'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Avatar */}
                        <div className="flex flex-col items-center space-y-4">
                            <div
                                className={`relative w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 ${canEdit ? 'border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary transition-colors' : 'border-muted-foreground/10'}`}
                                onClick={canEdit ? () => fileInputRef.current?.click() : undefined}
                                role={canEdit ? 'button' : undefined}
                                tabIndex={canEdit ? 0 : undefined}
                                onKeyDown={canEdit ? (e) => e.key === 'Enter' && fileInputRef.current?.click() : undefined}
                            >
                                {avatarPreview ? (
                                    <Image
                                        src={avatarPreview}
                                        alt="Avatar preview"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <User className="w-16 h-16 text-muted-foreground" />
                                )}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    </div>
                                )}
                            </div>
                            {canEdit && (
                                <>
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
                                        {avatarPreview ? 'Bytt bilde' : 'Last opp bilde'}
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        Maks 1MB. JPG, PNG eller GIF.
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Name Field */}
                        <div className="space-y-2">
                            <Label htmlFor="firstName">Navn</Label>
                            <Input
                                id="firstName"
                                placeholder="Ditt navn"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                disabled={!canEdit}
                                className={!canEdit ? 'bg-muted' : ''}
                            />
                        </div>

                        {/* Email (read-only) */}
                        <div className="space-y-2">
                            <Label htmlFor="email">E-post</Label>
                            <Input
                                id="email"
                                value={email}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                                E-postadressen kan ikke endres
                            </p>
                        </div>

                        {/* Role (read-only) */}
                        <div className="space-y-2">
                            <Label>Rolle</Label>
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-muted-foreground" />
                                <Badge variant={role === 'teacher' ? 'default' : role === 'admin' ? 'default' : 'secondary'}>
                                    {role === 'teacher' ? 'Lærer' : role === 'admin' ? 'Admin' : 'Elev'}
                                </Badge>
                            </div>
                        </div>

                        {/* Utdanningsprogram */}
                        {programs.length > 0 && (
                            <div className="space-y-2">
                                <Label>Utdanningsprogram</Label>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                                    {programs.map(p => (
                                        <Badge key={p.id} variant="outline">{p.code}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}

                        {success && (
                            <p className="text-sm text-green-600 flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                Profilen er oppdatert!
                            </p>
                        )}

                        {canEdit && (
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Lagrer...
                                    </>
                                ) : (
                                    'Lagre endringer'
                                )}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
