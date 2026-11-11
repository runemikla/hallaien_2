// Prebuilt voices supported by Gemini Live (native audio).
export const GEMINI_VOICES = [
    { id: 'Kore', label: 'Kore (kvinne, rolig og tydelig)' },
    { id: 'Aoede', label: 'Aoede (kvinne, lett og luftig)' },
    { id: 'Leda', label: 'Leda (kvinne, ungdommelig)' },
    { id: 'Zephyr', label: 'Zephyr (kvinne, lys)' },
    { id: 'Puck', label: 'Puck (mann, energisk)' },
    { id: 'Charon', label: 'Charon (mann, informativ)' },
    { id: 'Fenrir', label: 'Fenrir (mann, engasjert)' },
    { id: 'Orus', label: 'Orus (mann, fast)' },
] as const

export const DEFAULT_VOICE = 'Kore'

export function isValidVoice(voice: string | null | undefined): voice is string {
    return !!voice && GEMINI_VOICES.some(v => v.id === voice)
}
