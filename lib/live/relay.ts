import type { IncomingMessage } from 'node:http'
import type { WebSocket } from 'ws'
import { getToken } from 'next-auth/jwt'
import { Modality, type LiveServerMessage, type Session } from '@google/genai'
import { createGenAI, LIVE_MODEL } from '@/lib/gemini/client'
import { DEFAULT_VOICE, isValidVoice } from '@/lib/gemini/voices'
import { getAccessibleAssistant } from '@/lib/db'
import { INPUT_SAMPLE_RATE, type ServerEvent } from '@/lib/live/protocol'
import type { Role } from '@/lib/roles'

const MAX_SESSION_MS = 20 * 60 * 1000
const MAX_AUDIO_FRAME_BYTES = 64 * 1024

/** Reads the Auth.js session cookie from the upgrade request. */
async function userFromRequest(req: IncomingMessage): Promise<{ id: string; role: Role } | null> {
    const secret = process.env.AUTH_SECRET
    if (!secret) throw new Error('AUTH_SECRET is not set')
    const headers = new Headers({ cookie: req.headers.cookie || '' })
    // The cookie has the __Secure- prefix when the site is served over https.
    for (const secureCookie of [true, false]) {
        const token = await getToken({ req: { headers }, secret, secureCookie })
        if (token?.uid && token.role) return { id: token.uid as string, role: token.role as Role }
    }
    return null
}

/** Only accept WebSocket connections opened by our own pages. */
export function isSameOrigin(req: IncomingMessage): boolean {
    const origin = req.headers.origin
    if (!origin) return false
    try {
        const host = req.headers['x-forwarded-host'] || req.headers.host
        return new URL(origin).host === host
    } catch {
        return false
    }
}

/**
 * Relays one voice conversation between a browser and Gemini Live.
 * The system instruction and the Google credentials never leave the server.
 */
export async function handleLiveConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    let session: Session | null = null
    let closed = false

    const send = (event: ServerEvent) => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(event))
    }
    const close = (error?: string) => {
        if (closed) return
        closed = true
        clearTimeout(timer)
        if (error) send({ type: 'error', message: error })
        try { session?.close() } catch { /* already closed */ }
        if (ws.readyState === ws.OPEN) ws.close(1000)
    }
    const timer = setTimeout(() => close('Samtalen har nådd maks lengde. Start en ny samtale.'), MAX_SESSION_MS)

    ws.on('close', () => close())
    ws.on('error', () => close())
    ws.on('message', (data, isBinary) => {
        if (!isBinary || !session || closed) return
        const audio = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data as ArrayBuffer)
        if (audio.length === 0 || audio.length > MAX_AUDIO_FRAME_BYTES) return
        session.sendRealtimeInput({
            audio: { data: audio.toString('base64'), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
        })
    })

    try {
        const user = await userFromRequest(req)
        if (!user) return close('Ikke innlogget')

        const assistantId = new URL(req.url || '', 'http://localhost').searchParams.get('assistantId') || ''
        const assistant = await getAccessibleAssistant(user, assistantId)
        if (!assistant) return close('Ingen tilgang til denne assistenten')
        if (closed) return

        const onMessage = (msg: LiveServerMessage) => {
            const sc = msg.serverContent
            if (!sc || closed) return
            if (sc.interrupted) send({ type: 'interrupted' })
            for (const part of sc.modelTurn?.parts ?? []) {
                if (part.inlineData?.data && ws.readyState === ws.OPEN) {
                    ws.send(Buffer.from(part.inlineData.data, 'base64'), { binary: true })
                }
            }
            if (sc.inputTranscription?.text) {
                send({ type: 'transcript', role: 'user', text: sc.inputTranscription.text })
            }
            if (sc.outputTranscription?.text) {
                send({ type: 'transcript', role: 'assistant', text: sc.outputTranscription.text })
            }
            if (sc.turnComplete) send({ type: 'turn_complete' })
        }

        const live = await createGenAI().live.connect({
            model: LIVE_MODEL,
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: assistant.system_instruction,
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: isValidVoice(assistant.voice) ? assistant.voice : DEFAULT_VOICE,
                        },
                    },
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
            callbacks: {
                onmessage: onMessage,
                onerror: (e) => {
                    console.error('[live] Gemini error:', e.message)
                    close('Tilkoblingen til talemodellen feilet')
                },
                onclose: (e) => {
                    if (e.code !== 1000) console.warn('[live] Gemini closed:', e.code, e.reason)
                    close(e.code === 1000 ? undefined : 'Samtalen ble avsluttet av talemodellen')
                },
            },
        })

        if (closed) {
            live.close()
            return
        }
        session = live
        send({ type: 'ready' })
    } catch (error) {
        console.error('[live] Could not start conversation:', error)
        close('Kunne ikke starte samtale')
    }
}
