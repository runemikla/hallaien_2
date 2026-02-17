'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { redeemShareCode } from '@/app/actions/share'
import { Loader2, KeyRound, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function RedeemCodePage() {
    const router = useRouter()
    const [code, setCode] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const result = await redeemShareCode(code)

        if (result.error) {
            setError(result.error)
            setIsLoading(false)
        } else {
            router.push('/student')
        }
    }

    // Format input as user types (uppercase, max 6 chars)
    function handleCodeChange(value: string) {
        const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
        setCode(formatted)
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-md">
                <Link href="/student" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Tilbake
                </Link>

                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <KeyRound className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="font-[family-name:var(--font-roboto-slab)]">
                            Tast inn kode
                        </CardTitle>
                        <CardDescription>
                            Skriv inn sekssifret kode fra læreren din
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Input
                                    value={code}
                                    onChange={(e) => handleCodeChange(e.target.value)}
                                    placeholder="ABC123"
                                    className="text-center text-3xl font-mono tracking-[0.5em] uppercase h-16"
                                    maxLength={6}
                                    required
                                />
                                <p className="text-sm text-muted-foreground text-center">
                                    Koden gir deg tilgang i 24 timer
                                </p>
                            </div>

                            {error && (
                                <p className="text-sm text-destructive text-center">{error}</p>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading || code.length !== 6}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sjekker kode...
                                    </>
                                ) : (
                                    'Få tilgang'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
