'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { INPUT_SAMPLE_RATE, LIVE_PATH, OUTPUT_SAMPLE_RATE, type ServerEvent } from '@/lib/live/protocol'

export type LiveStatus = 'disconnected' | 'connecting' | 'connected'

type Options = {
    assistantId: string
    micMuted: boolean
    onTranscript: (role: 'user' | 'assistant', text: string, final: boolean) => void
    onError: (message: string) => void
}

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

function pcmToFloat(data: ArrayBuffer): Float32Array<ArrayBuffer> {
    const pcm = new Int16Array(data, 0, Math.floor(data.byteLength / 2))
    const out = new Float32Array(pcm.length)
    for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 0x8000
    return out
}

/**
 * Voice conversation through the server's /api/live WebSocket: streams the
 * microphone as 16 kHz PCM and plays the assistant's 24 kHz PCM answer, with
 * live transcription.
 */
export function useLiveConversation({ assistantId, micMuted, onTranscript, onError }: Options) {
    const [status, setStatus] = useState<LiveStatus>('disconnected')
    const [isSpeaking, setIsSpeaking] = useState(false)

    const socketRef = useRef<WebSocket | null>(null)
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

    const playChunk = useCallback((data: ArrayBuffer) => {
        const ctx = outCtxRef.current
        const gain = outGainRef.current
        if (!ctx || !gain) return
        const samples = pcmToFloat(data)
        if (samples.length === 0) return
        const buffer = ctx.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE)
        buffer.copyToChannel(samples, 0)
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

    const handleEvent = useCallback((event: ServerEvent) => {
        const { onTranscript, onError } = callbacksRef.current
        switch (event.type) {
            case 'ready':
                setStatus('connected')
                break
            case 'transcript':
                onTranscript(event.role, event.text, false)
                break
            case 'interrupted':
                stopPlayback()
                onTranscript('assistant', '', true)
                break
            case 'turn_complete':
                onTranscript('assistant', '', true)
                break
            case 'error':
                onError(event.message)
                break
        }
    }, [stopPlayback])

    const start = useCallback(async () => {
        if (socketRef.current) return
        setStatus('connecting')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            })
            streamRef.current = stream

            // Output: 24 kHz playback with an analyser for the orb.
            const outCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE })
            const gain = outCtx.createGain()
            const analyser = outCtx.createAnalyser()
            analyser.fftSize = 256
            gain.connect(analyser)
            analyser.connect(outCtx.destination)
            outCtxRef.current = outCtx
            outGainRef.current = gain
            analyserRef.current = analyser

            // Input: 16 kHz capture through an AudioWorklet.
            const inCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE })
            inCtxRef.current = inCtx
            const workletUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }))
            await inCtx.audioWorklet.addModule(workletUrl)
            URL.revokeObjectURL(workletUrl)
            const mic = inCtx.createMediaStreamSource(stream)
            const worklet = new AudioWorkletNode(inCtx, 'pcm-capture')
            mic.connect(worklet)

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            const socket = new WebSocket(
                `${protocol}//${window.location.host}${LIVE_PATH}?assistantId=${encodeURIComponent(assistantId)}`,
            )
            socket.binaryType = 'arraybuffer'
            socketRef.current = socket
            let ready = false

            socket.onmessage = (ev: MessageEvent<ArrayBuffer | string>) => {
                if (typeof ev.data !== 'string') {
                    playChunk(ev.data)
                    return
                }
                try {
                    const event = JSON.parse(ev.data) as ServerEvent
                    if (event.type === 'ready') ready = true
                    handleEvent(event)
                } catch { /* ignore malformed frames */ }
            }
            socket.onerror = () => {
                if (!ready) callbacksRef.current.onError('Kunne ikke koble til. Prøv igjen.')
            }
            socket.onclose = () => {
                if (socketRef.current === socket) socketRef.current = null
                cleanup()
            }

            worklet.port.onmessage = (ev: MessageEvent<{ pcm?: ArrayBuffer; level?: number }>) => {
                if (ev.data.level !== undefined) {
                    inputLevelRef.current = mutedRef.current ? 0 : ev.data.level
                    return
                }
                if (!ev.data.pcm || mutedRef.current || !ready) return
                if (socket.readyState === WebSocket.OPEN) socket.send(ev.data.pcm)
            }
        } catch (err) {
            console.error('Voice chat error:', err)
            const message = err instanceof DOMException && err.name === 'NotAllowedError'
                ? 'Du må gi nettleseren tilgang til mikrofonen'
                : err instanceof Error ? err.message : 'En feil oppstod'
            callbacksRef.current.onError(message)
            socketRef.current?.close()
            socketRef.current = null
            cleanup()
        }
    }, [assistantId, cleanup, handleEvent, playChunk])

    const stop = useCallback(() => {
        const socket = socketRef.current
        socketRef.current = null
        socket?.close()
        cleanup()
    }, [cleanup])

    // Close the connection if the component unmounts mid-call.
    useEffect(() => () => {
        socketRef.current?.close()
        socketRef.current = null
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
