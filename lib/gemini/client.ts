import { GoogleGenAI } from '@google/genai'

export const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live'

/**
 * Production: Vertex AI in the EU multi-region, so audio is processed in the EU
 * (GOOGLE_GENAI_USE_VERTEXAI=true, GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION=eu).
 * Development: a Gemini API key (GEMINI_API_KEY), which gives no EU guarantee.
 */
export function createGenAI(): GoogleGenAI {
    if (process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true') {
        const project = process.env.GOOGLE_CLOUD_PROJECT
        if (!project) throw new Error('GOOGLE_CLOUD_PROJECT is not set')
        return new GoogleGenAI({
            vertexai: true,
            project,
            location: process.env.GOOGLE_CLOUD_LOCATION || 'eu',
        })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
    const apiVersion = process.env.GEMINI_API_VERSION
    return new GoogleGenAI({ apiKey, ...(apiVersion ? { httpOptions: { apiVersion } } : {}) })
}
