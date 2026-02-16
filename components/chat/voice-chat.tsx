'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { useConversation } from '@elevenlabs/react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Orb, type AgentState } from '@/components/ui/orb'
import { User, Phone, PhoneOff, Loader2, Download, Trash2 } from 'lucide-react'

type VoiceChatProps = Readonly<{
    agentId: string
    assistantName: string
    avatarUrl?: string | null
}>

type TranscriptEntry = {
    id: string
    role: 'user' | 'assistant'
    text: string
    timestamp: Date
}

function generatePDF(transcript: TranscriptEntry[], assistantName: string) {
    // Create a simple HTML document for printing as PDF
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Samtale med ${assistantName}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        h1 { color: #333; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
        .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
        .entry { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
        .user { background: #f0f9ff; border-left: 4px solid #0d9488; }
        .assistant { background: #f5f5f5; border-left: 4px solid #666; }
        .role { font-weight: bold; color: #333; margin-bottom: 5px; }
        .time { color: #999; font-size: 12px; float: right; }
        .text { color: #444; line-height: 1.6; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
    <h1>Samtale med ${assistantName}</h1>
    <div class="meta">Generert: ${new Date().toLocaleString('no-NO')}</div>
    ${transcript.map(entry => `
        <div class="entry ${entry.role}">
            <div class="role">
                ${entry.role === 'user' ? 'Elev' : 'Assistent'}
                <span class="time">${formatTime(entry.timestamp)}</span>
            </div>
            <div class="text">${entry.text}</div>
        </div>
    `).join('')}
</body>
</html>
    `

    // Create blob and download
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)

    // Open in new window for printing/saving as PDF
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
        printWindow.onload = () => {
            printWindow.print()
        }
    }

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export function VoiceChat({ agentId, assistantName, avatarUrl }: VoiceChatProps) {
    const [isConnecting, setIsConnecting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
    const transcriptRef = useRef<HTMLDivElement>(null)

    // Auto-scroll transcript
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
        }
    }, [transcript])

    const addTranscriptEntry = useCallback((role: 'user' | 'assistant', text: string) => {
        if (!text.trim()) return
        setTranscript(prev => [...prev, {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            role,
            text: text.trim(),
            timestamp: new Date()
        }])
    }, [])

    const conversation = useConversation({
        onConnect: () => {
            console.log('Connected to ElevenLabs')
            setIsConnecting(false)
            setTranscript([]) // Clear transcript on new conversation
        },
        onDisconnect: () => {
            console.log('Disconnected from ElevenLabs')
        },
        onError: (error) => {
            console.error('ElevenLabs error:', error)
            setError(typeof error === 'string' ? error : 'En feil oppstod')
            setIsConnecting(false)
        },
        onMessage: (message) => {
            console.log('Message received:', JSON.stringify(message, null, 2))

            // Handle different message types from ElevenLabs WebSocket
            const msg = message as {
                type?: string
                source?: string
                role?: string
                user_transcript?: string
                user_transcription?: string
                agent_response?: string
                message?: string
                transcript?: string
                text?: string
            }

            console.log('Message type:', msg.type, 'Source:', msg.source, 'Role:', msg.role)

            // Get the text content from various possible fields
            const text = msg.user_transcript || msg.user_transcription || msg.agent_response || msg.message || msg.transcript || msg.text || ''

            if (!text.trim()) return

            // Determine if this is a user or assistant message
            let isUser = false

            // Check by type
            if (msg.type === 'user_transcript' || msg.type === 'user_transcription') {
                isUser = true
            } else if (msg.type !== 'agent_response') {
                // Check by source field
                if (msg.source === 'user') {
                    isUser = true
                } else if (msg.source !== 'agent' && msg.source !== 'assistant') {
                    // Check by role field
                    if (msg.role === 'user') {
                        isUser = true
                    } else if (msg.role !== 'assistant' && msg.role !== 'agent') {
                        // Check which field had the content
                        if (msg.user_transcript || msg.user_transcription) {
                            isUser = true
                        }
                        // Default: isUser remains false for unidentified messages
                    }
                }
            }

            console.log('Adding transcript as:', isUser ? 'USER' : 'ASSISTANT', '- Text:', text.substring(0, 50))
            addTranscriptEntry(isUser ? 'user' : 'assistant', text)
        },
    })

    // Update transcript ref when transcript changes for onDisconnect
    useEffect(() => {
        // This effect ensures the disconnect handler has access to latest transcript
    }, [transcript, agentId, assistantName])

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

    const handleDownloadPDF = useCallback(() => {
        if (transcript.length === 0) return
        generatePDF(transcript, assistantName)
    }, [transcript, assistantName])

    const clearTranscript = useCallback(() => {
        setTranscript([])
    }, [])

    const isConnected = conversation.status === 'connected'
    const isSpeaking = conversation.isSpeaking

    // Map conversation state to AgentState for Orb
    const getAgentState = (): AgentState => {
        if (!isConnected) return null
        if (isSpeaking) return "talking"
        return "listening"
    }

    // Get audio volume levels from conversation for Orb reactivity
    // These functions are called on every animation frame by the Orb component
    const getInputVolume = () => {
        return conversation.getInputVolume?.() ?? 0
    }

    const getOutputVolume = () => {
        return conversation.getOutputVolume?.() ?? 0
    }

    return (
        <div className="space-y-4">
            {/* Voice Chat Section with Orb */}
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    {/* Using VLFK Light Blue #9ADBE8 as background */}
                    <div className="bg-[#9ADBE8]/20 p-8 text-center">
                        {/* Orb Container */}
                        <div className="relative w-32 h-32 mx-auto mb-4">
                            <div className="absolute inset-0 bg-[#9ADBE8]/40 rounded-full shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]" />
                            <div className="absolute inset-2 bg-white rounded-full overflow-hidden shadow-[inset_0_0_12px_rgba(0,0,0,0.05)]">
                                {isConnected ? (
                                    <Orb
                                        colors={["#9ADBE8", "#7BCCD9"]}
                                        agentState={getAgentState()}
                                        volumeMode="manual"
                                        getInputVolume={getInputVolume}
                                        getOutputVolume={getOutputVolume}
                                        className="h-full w-full"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                        {avatarUrl ? (
                                            <Image
                                                src={avatarUrl}
                                                alt={assistantName}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <User className="w-10 h-10 text-[#9ADBE8]" />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <h2 className="text-xl font-bold font-[family-name:var(--font-roboto-slab)] mb-2">
                            {assistantName}
                        </h2>

                        <p className="text-sm text-muted-foreground mb-6">
                            {isConnecting && 'Kobler til...'}
                            {isConnected && !isSpeaking && 'Lytter...'}
                            {isConnected && isSpeaking && 'Assistenten snakker...'}
                            {!isConnecting && !isConnected && 'Trykk på knappen for å starte samtale'}
                        </p>

                        {error && (
                            <p className="text-sm text-destructive mb-4">{error}</p>
                        )}

                        {/* Call Button - using standard Button styles like dashboard */}
                        <div className="flex justify-center">
                            {isConnected ? (
                                <Button
                                    size="lg"
                                    variant="destructive"
                                    onClick={endConversation}
                                    className="rounded-full h-14 w-14"
                                >
                                    <PhoneOff className="w-6 h-6" />
                                </Button>
                            ) : (
                                <Button
                                    size="lg"
                                    onClick={startConversation}
                                    disabled={isConnecting}
                                    className="rounded-full h-14 w-14"
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

            {/* Transcript Section */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold font-[family-name:var(--font-roboto-slab)]">
                            Transkripsjon
                        </h3>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={clearTranscript}
                                disabled={transcript.length === 0}
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Tøm
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleDownloadPDF}
                                disabled={transcript.length === 0}
                            >
                                <Download className="w-4 h-4 mr-1" />
                                Last ned PDF
                            </Button>
                        </div>
                    </div>

                    {transcript.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Transkripsjon vil vises her når samtalen starter.
                        </p>
                    ) : (
                        <div
                            ref={transcriptRef}
                            className="max-h-80 overflow-y-auto space-y-3"
                        >
                            {transcript.map((entry) => (
                                <div
                                    key={entry.id}
                                    className={`p-4 rounded-lg border-l-4 ${
                                        entry.role === 'user'
                                            ? 'bg-[#FDDA25]/10 border-[#FDDA25]'
                                            : 'bg-muted border-muted-foreground/30'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-sm">
                                            {entry.role === 'user' ? 'Elev' : 'Assistent'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {entry.timestamp.toLocaleTimeString('no-NO', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{entry.text}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
