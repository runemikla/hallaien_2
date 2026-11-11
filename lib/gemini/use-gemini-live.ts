'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai'

export type LiveStatus = 'disconnected' | 'connecting' | 'connected'

type Options = {
    assistantId: string
    micMuted: boolean
    onTranscript: (role: 'user' | 'assistant', text: string, final: boolean) => void
    onError: (message: string) => void
}

const INPUT_RATE = 16000
const OUTPUT_RATE = 24000

// AudioWorklet that forwards 16-bit PCM chunks (~100 ms) and the input level.
const WORKLET_SRC = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Int16Array(1600); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    let sum = 0;
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      sum += s * s;
      this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === this.buf.length) {
        this.port.postMessage({ pcm: this.buf.buffer.slice(0) });
        this.n = 0;
      }
    }
    this.port.postMessage({ level: Math.sqrt(sum / ch.length) });
    return true;
  }
}
registerProcessor('pcm-capture', PcmCapture);
`

function toBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    }
    return btoa(binary)
}

function fromBase64Pcm(data: string): Float32Array {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const pcm = new Int16Array(bytes.buffer)
    const out = new Float32Array(pcm.length)
    for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 0x8000
    return out
}

/**
 * Voice conversation with Gemini Live: streams the microphone as 16 kHz PCM
 * and plays the model's 24 kHz PCM answer, with live transcription.
 */
export function useGeminiLive({ assistantId, micMuted, onTranscript, onError }: Options) {
    const [status, setStatus] = useState<LiveStatus>('disconnected')
    const [isSpeaking, setIsSpeaking] = useState(false)

    const sessionRef = useRef<Session | null>(null)
    const inCtxRef = useRef<AudioContext | null>(null)
    const outCtxRef = useRef<AudioContext | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const outGainRef = useRef<GainNode | null>(null)
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set())
    const playheadRef = useRef(0)
    const inputLevelRef = useRef(0)
    const mutedRef = useRef(micMuted)
    const callbacksRef = useRef({ onTranscript, onError })

    useEffect(() => { mutedRef.current = micMuted }, [micMuted])
    useEffect(() => { callbacksRef.current = { onTranscript, onError } }, [onTranscript, onError])

    const stopPlayback = useCallback(() => {
        sourcesRef.current.forEach(s => { try { s.stop() } catch { /* already stopped */ } })
        sourcesRef.current.clear()
        playheadRef.current = 0
        setIsSpeaking(false)
    }, [])

    const cleanup = useCallback(() => {
        stopPlayback()
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        inCtxRef.current?.close().catch(() => {})
        outCtxRef.current?.close().catch(() => {})
        inCtxRef.current = null
        outCtxRef.current = null
        analyserRef.current = null
        outGainRef.current = null
        inputLevelRef.current = 0
        setStatus('disconnected')
    }, [stopPlayback])

    const playChunk = useCallback((base64: string) => {
        const ctx = outCtxRef.current
        const gain = outGainRef.current
        if (!ctx || !gain) return
        const samples = fromBase64Pcm(base64)
        const buffer = ctx.createBuffer(1, samples.length, OUTPUT_RATE)
        buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0)
        const src = ctx.createBufferSource()
        src.buffer = buffer
        src.connect(gain)
        const startAt = Math.max(ctx.currentTime, playheadRef.current)
        src.start(startAt)
        playheadRef.current = startAt + buffer.duration
        sourcesRef.current.add(src)
        setIsSpeaking(true)
        src.onended = () => {
            sourcesRef.current.delete(src)
            if (sourcesRef.current.size === 0) setIsSpeaking(false)
        }
    }, [])

    const handleMessage = useCallback((msg: LiveServerMessage) => {
        const sc = msg.serverContent
        if (!sc) return
        if (sc.interrupted) stopPlayback()
        sc.modelTurn?.parts?.forEach(part => {
            if (part.inlineData?.data) playChunk(part.inlineData.data)
        })
        const { onTranscript } = callbacksRef.current
        if (sc.inputTranscription?.text) onTranscript('user', sc.inputTranscription.text, false)
        if (sc.outputTranscription?.text) onTranscript('assistant', sc.outputTranscription.text, false)
        if (sc.turnComplete || sc.interrupted) onTranscript('assistant', '', true)
    }, [playChunk, stopPlayback])

    const start = useCallback(async () => {
        if (sessionRef.current) return
        setStatus('connecting')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            })
            streamRef.current = stream

            const res = await fetch('/api/gemini/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assistantId }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok || !body.token) throw new Error(body.error || 'Kunne ikke starte samtale')

            // Output: 24 kHz playback with an analyser for the orb.
            const outCtx = new AudioContext({ sampleRate: OUTPUT_RATE })
            const gain = outCtx.createGain()
            const analyser = outCtx.createAnalyser()
            analyser.fftSize = 256
            gain.connect(analyser)
            analyser.connect(outCtx.destination)
            outCtxRef.current = outCtx
            outGainRef.current = gain
            analyserRef.current = analyser

            // Input: 16 kHz capture through an AudioWorklet.
            const inCtx = new AudioContext({ sampleRate: INPUT_RATE })
            inCtxRef.current = inCtx
            const workletUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }))
            await inCtx.audioWorklet.addModule(workletUrl)
            URL.revokeObjectURL(workletUrl)
            const mic = inCtx.createMediaStreamSource(stream)
            const worklet = new AudioWorkletNode(inCtx, 'pcm-capture')
            mic.connect(worklet)

            const ai = new GoogleGenAI({ apiKey: body.token, httpOptions: { apiVersion: 'v1alpha' } })
            const session = await ai.live.connect({
                model: body.model,
                config: { responseModalities: [Modality.AUDIO] },
                callbacks: {
                    onopen: () => setStatus('connected'),
                    onmessage: handleMessage,
                    onerror: (e: ErrorEvent) => {
                        console.error('Gemini Live error:', e)
                        callbacksRef.current.onError('Tilkoblingen til talemodellen feilet')
                    },
                    onclose: (e: CloseEvent) => {
                        if (e.code !== 1000 && e.reason) console.warn('Gemini Live closed:', e.code, e.reason)
                        sessionRef.current = null
                        cleanup()
                    },
                },
            })
            sessionRef.current = session
            setStatus('connected')

            worklet.port.onmessage = (ev: MessageEvent<{ pcm?: ArrayBuffer; level?: number }>) => {
                if (ev.data.level !== undefined) {
                    inputLevelRef.current = mutedRef.current ? 0 : ev.data.level
                    return
                }
                if (!ev.data.pcm || mutedRef.current || !sessionRef.current) return
                sessionRef.current.sendRealtimeInput({
                    audio: { data: toBase64(ev.data.pcm), mimeType: `audio/pcm;rate=${INPUT_RATE}` },
                })
            }
        } catch (err) {
            console.error('Voice chat error:', err)
            const message = err instanceof DOMException && err.name === 'NotAllowedError'
                ? 'Du må gi nettleseren tilgang til mikrofonen'
                : err instanceof Error ? err.message : 'En feil oppstod'
            callbacksRef.current.onError(message)
            sessionRef.current?.close()
            sessionRef.current = null
            cleanup()
        }
    }, [assistantId, cleanup, handleMessage])

    const stop = useCallback(() => {
        const session = sessionRef.current
        sessionRef.current = null
        session?.close()
        cleanup()
    }, [cleanup])

    // Close the session if the component unmounts mid-call.
    useEffect(() => () => {
        sessionRef.current?.close()
        sessionRef.current = null
    }, [])

    const getInputVolume = useCallback(() => Math.min(1, inputLevelRef.current * 4), [])
    const getOutputVolume = useCallback(() => {
        const analyser = analyserRef.current
        if (!analyser) return 0
        const data = new Uint8Array(analyser.fftSize)
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (const v of data) { const s = (v - 128) / 128; sum += s * s }
        return Math.min(1, Math.sqrt(sum / data.length) * 4)
    }, [])

    return { status, isSpeaking, start, stop, getInputVolume, getOutputVolume }
}
