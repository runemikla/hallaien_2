/*
 * Protocol between the browser and /api/live (see lib/live/relay.ts).
 *
 * Browser -> server: binary frames with microphone audio, 16-bit PCM mono 16 kHz.
 * Server -> browser: binary frames with the assistant's voice, 16-bit PCM mono 24 kHz,
 *                    and JSON text frames of type ServerEvent.
 */
export const LIVE_PATH = '/api/live'
export const INPUT_SAMPLE_RATE = 16000
export const OUTPUT_SAMPLE_RATE = 24000

export type ServerEvent =
    | { type: 'ready' }
    | { type: 'transcript'; role: 'user' | 'assistant'; text: string }
    | { type: 'turn_complete' }
    | { type: 'interrupted' }
    | { type: 'error'; message: string }
