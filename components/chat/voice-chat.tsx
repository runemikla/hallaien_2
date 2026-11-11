'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { useGeminiLive } from '@/lib/gemini/use-gemini-live'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Orb, type AgentState } from '@/components/ui/orb'
import { User, Phone, PhoneOff, Loader2, Download, Trash2, Mic, MicOff } from 'lucide-react'

type VoiceChatProps = Readonly<{
    assistantId: string
    assistantName: string
    avatarUrl?: string | null
}>

type TranscriptEntry = {
    id: string
    role: 'user' | 'assistant'
    text: string
    timestamp: Date
    final?: boolean
}

function escapeHtml(text: string) {
    return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
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
    <title>Samtale med ${escapeHtml(assistantName)}</title>
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
    <h1>Samtale med ${escapeHtml(assistantName)}</h1>
    <div class="meta">Generert: ${new Date().toLocaleString('no-NO')}</div>
    ${transcript.map(entry => `
        <div class="entry ${entry.role}">
            <div class="role">
                ${entry.role === 'user' ? 'Elev' : 'Assistent'}
                <span class="time">${formatTime(entry.timestamp)}</span>
            </div>
            <div class="text">${escapeHtml(entry.text)}</div>
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

export function VoiceChat({ assistantId, assistantName, avatarUrl }: VoiceChatProps) {
    const [error, setError] = useState<string | null>(null)
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
    const [isMuted, setIsMuted] = useState(false)
    const transcriptRef = useRef<HTMLDivElement>(null)

    // Auto-scroll transcript
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
        }
    }, [transcript])

    // Gemini streams transcription in small pieces: append to the open entry
    // for the same speaker, or start a new one when the speaker changes.
    const handleTranscript = useCallback((role: 'user' | 'assistant', text: string, final: boolean) => {
        setTranscript(prev => {
            const last = prev[prev.length - 1]
            if (final) {
                if (last && !last.final) {
                    return [...prev.slice(0, -1), { ...last, final: true }]
                }
                return prev
            }
            if (!text) return prev
            if (last && last.role === role && !last.final) {
                return [...prev.slice(0, -1), { ...last, text: last.text + text }]
            }
            const closed = last && !last.final ? [...prev.slice(0, -1), { ...last, final: true }] : prev
            return [...closed, {
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                role,
                text,
                timestamp: new Date(),
            }]
        })
    }, [])

    const handleError = useCallback((message: string) => {
        setError(message)
    }, [])

    const live = useGeminiLive({
        assistantId,
        micMuted: isMuted,
        onTranscript: handleTranscript,
        onError: handleError,
    })

    const startConversation = useCallback(async () => {
        setError(null)
        setIsMuted(false)
        setTranscript([])
        await live.start()
    }, [live])

    const endConversation = useCallback(() => {
        live.stop()
    }, [live])

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev)
    }, [])

    const handleDownloadPDF = useCallback(() => {
        if (transcript.length === 0) return
        generatePDF(transcript.map(e => ({ ...e, text: e.text.trim() })), assistantName)
    }, [transcript, assistantName])

    const clearTranscript = useCallback(() => {
        setTranscript([])
    }, [])

    const isConnecting = live.status === 'connecting'
    const isConnected = live.status === 'connected'
    const isSpeaking = live.isSpeaking

    // Map conversation state to AgentState for Orb
    const getAgentState = (): AgentState => {
        if (!isConnected) return null
        if (isSpeaking) return "talking"
        return "listening"
    }

    // Called on every animation frame by the Orb component
    const getInputVolume = live.getInputVolume
    const getOutputVolume = live.getOutputVolume

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
                            {isConnected && isMuted && 'Mikrofon dempet'}
                            {isConnected && !isMuted && !isSpeaking && 'Lytter...'}
                            {isConnected && !isMuted && isSpeaking && 'Assistenten snakker...'}
                            {!isConnecting && !isConnected && 'Trykk på knappen for å starte samtale'}
                        </p>

                        {error && (
                            <p className="text-sm text-destructive mb-4">{error}</p>
                        )}

                        {/* Call Button - using standard Button styles like dashboard */}
                        <div className="flex justify-center gap-4">
                            {isConnected ? (
                                <>
                                    <Button
                                        size="lg"
                                        variant={isMuted ? "default" : "outline"}
                                        onClick={toggleMute}
                                        className={`rounded-full h-14 w-14 transition-colors ${
                                            isMuted
                                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
                                                : 'hover:bg-muted'
                                        }`}
                                        title={isMuted ? 'Slå på mikrofon' : 'Demp mikrofon'}
                                    >
                                        {isMuted ? (
                                            <MicOff className="w-6 h-6" />
                                        ) : (
                                            <Mic className="w-6 h-6" />
                                        )}
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="destructive"
                                        onClick={endConversation}
                                        className="rounded-full h-14 w-14"
                                    >
                                        <PhoneOff className="w-6 h-6" />
                                    </Button>
                                </>
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
                                    <p className="text-sm text-muted-foreground">{entry.text.trim()}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
