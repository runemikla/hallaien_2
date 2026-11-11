import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Modality } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { getAccessibleAssistant } from '@/lib/assistant-access'
import { DEFAULT_VOICE, isValidVoice } from '@/lib/gemini/voices'

const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live'

/**
 * Issues a short-lived, single-use Gemini Live token for one assistant.
 * The system instruction and voice are locked into the token on the server,
 * so the browser never sees the API key or the teacher's instruction.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
        }

        const { assistantId } = await request.json().catch(() => ({}))
        if (!assistantId || typeof assistantId !== 'string') {
            return NextResponse.json({ error: 'Mangler assistent' }, { status: 400 })
        }

        const assistant = await getAccessibleAssistant(supabase, user.id, assistantId)
        if (!assistant) {
            return NextResponse.json({ error: 'Ingen tilgang til denne assistenten' }, { status: 403 })
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY er ikke satt' }, { status: 500 })
        }

        const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } })
        const now = Date.now()
        const token = await ai.authTokens.create({
            config: {
                uses: 1,
                expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
                newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
                liveConnectConstraints: {
                    model: LIVE_MODEL,
                    config: {
                        responseModalities: [Modality.AUDIO],
                        systemInstruction: assistant.system_instruction || undefined,
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
                },
                httpOptions: { apiVersion: 'v1alpha' },
            },
        })

        return NextResponse.json({ token: token.name, model: LIVE_MODEL })
    } catch (error) {
        console.error('Error creating Gemini token:', error)
        return NextResponse.json({ error: 'Kunne ikke starte samtale' }, { status: 500 })
    }
}
