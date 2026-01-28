'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { generateShareCode } from '@/app/actions/share'
import { Copy, Check, Plus, Clock } from 'lucide-react'

type ShareCode = {
    id: string
    code: string
    expires_at: string
    created_at: string
}

type Assistant = {
    id: string
    name: string
}

type ShareCodeGeneratorProps = {
    assistant: Assistant
    existingCodes: ShareCode[]
}

export function ShareCodeGenerator({ assistant, existingCodes }: ShareCodeGeneratorProps) {
    const [codes, setCodes] = useState<ShareCode[]>(existingCodes)
    const [isLoading, setIsLoading] = useState(false)
    const [copiedCode, setCopiedCode] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function handleGenerateCode() {
        setIsLoading(true)
        setError(null)

        const result = await generateShareCode(assistant.id)

        if (result.error) {
            setError(result.error)
        } else if (result.shareCode) {
            setCodes([result.shareCode, ...codes])
        }

        setIsLoading(false)
    }

    function copyToClipboard(code: string) {
        navigator.clipboard.writeText(code)
        setCopiedCode(code)
        setTimeout(() => setCopiedCode(null), 2000)
    }

    function getTimeRemaining(expiresAt: string) {
        const expiry = new Date(expiresAt)
        const now = new Date()
        const hoursLeft = Math.max(0, Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60)))
        return hoursLeft
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-[family-name:var(--font-roboto-slab)]">
                    Del &quot;{assistant.name}&quot;
                </CardTitle>
                <CardDescription>
                    Generer en delingskode som gir elever tilgang i 24 timer
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Button onClick={handleGenerateCode} disabled={isLoading} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    {isLoading ? 'Genererer...' : 'Generer ny kode'}
                </Button>

                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}

                {codes.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-medium">Aktive koder</h3>
                        {codes.map((shareCode) => (
                            <div
                                key={shareCode.id}
                                className="flex items-center justify-between p-4 bg-muted rounded-lg"
                            >
                                <div className="space-y-1">
                                    <p className="font-mono text-2xl font-bold tracking-widest">
                                        {shareCode.code}
                                    </p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Utløper om {getTimeRemaining(shareCode.expires_at)} timer
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => copyToClipboard(shareCode.code)}
                                >
                                    {copiedCode === shareCode.code ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {codes.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                        Ingen aktive koder. Generer en kode for å dele med elevene.
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
