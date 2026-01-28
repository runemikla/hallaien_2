'use client'

import { useCallback, useState } from 'react'
import { useConversation } from '@elevenlabs/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react'

type VoiceChatProps = Readonly<{
    agentId: string
    assistantName: string
}>

export function VoiceChat({ agentId, assistantName }: VoiceChatProps) {
    const [isConnecting, setIsConnecting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const conversation = useConversation({
        onConnect: () => {
            console.log('Connected to ElevenLabs')
            setIsConnecting(false)
        },
        onDisconnect: () => {
            console.log('Disconnected from ElevenLabs')
        },
        onError: (error) => {
            console.error('ElevenLabs error:', error)
            setError(error.message || 'En feil oppstod')
            setIsConnecting(false)
        },
        onMessage: (message) => {
            console.log('Message:', message)
        },
    })

    const startConversation = useCallback(async () => {
        setIsConnecting(true)
        setError(null)

        try {
            // Request microphone permission
            await navigator.mediaDevices.getUserMedia({ audio: true })

            // Get signed URL from our API
            console.log('Fetching signed URL for agent:', agentId)
            const response = await fetch('/api/elevenlabs/signed-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                console.error('Signed URL error:', errorData)
                throw new Error(errorData.error || 'Kunne ikke starte samtale')
            }

            const { signedUrl } = await response.json()
            console.log('Got signed URL:', signedUrl ? 'yes' : 'no')

            // Start conversation with signed URL
            await conversation.startSession({
                signedUrl,
            })
        } catch (err) {
            console.error('Voice chat error:', err)
            setError(err instanceof Error ? err.message : 'En feil oppstod')
            setIsConnecting(false)
        }
    }, [agentId, conversation])

    const endConversation = useCallback(async () => {
        await conversation.endSession()
    }, [conversation])

    const toggleMute = useCallback(() => {
        if (conversation.isSpeaking) {
            // Can't mute while the agent is speaking
            return
        }
        // Toggle microphone - this isn't directly supported, 
        // but we can track our own state
    }, [conversation])

    const isConnected = conversation.status === 'connected'
    const isSpeaking = conversation.isSpeaking

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-8 text-center">
                    <div className="w-24 h-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
                        {isConnected ? (
                            <div className={`w-16 h-16 bg-primary rounded-full ${isSpeaking ? 'animate-pulse' : ''}`} />
                        ) : (
                            <Mic className="w-10 h-10 text-primary" />
                        )}
                    </div>

                    <h2 className="text-xl font-bold font-[family-name:var(--font-roboto-slab)] mb-2">
                        {assistantName}
                    </h2>

                    <p className="text-sm text-muted-foreground mb-2">
                        {isConnecting && 'Kobler til...'}
                        {isConnected && !isSpeaking && 'Lytter...'}
                        {isConnected && isSpeaking && 'Assistenten snakker...'}
                        {!isConnecting && !isConnected && 'Trykk på knappen for å starte samtale'}
                    </p>

                    {error && (
                        <p className="text-sm text-destructive mb-4">{error}</p>
                    )}

                    <div className="flex justify-center gap-4">
                        {isConnected ? (
                            <>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={toggleMute}
                                    className="rounded-full h-16 w-16"
                                    disabled={isSpeaking}
                                >
                                    {isSpeaking ? (
                                        <MicOff className="w-6 h-6" />
                                    ) : (
                                        <Mic className="w-6 h-6" />
                                    )}
                                </Button>
                                <Button
                                    size="lg"
                                    variant="destructive"
                                    onClick={endConversation}
                                    className="rounded-full h-16 w-16"
                                >
                                    <PhoneOff className="w-6 h-6" />
                                </Button>
                            </>
                        ) : (
                            <Button
                                size="lg"
                                onClick={startConversation}
                                disabled={isConnecting}
                                className="rounded-full h-16 w-16"
                            >
                                {isConnecting ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <Phone className="w-6 h-6" />
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
