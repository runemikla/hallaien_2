import { randomInt } from 'node:crypto'
import { Timestamp, type DocumentSnapshot } from '@google-cloud/firestore'
import { db } from './firestore'
import type { SessionUser } from '@/lib/session'

/*
 * Collections
 *   assistants/{id}                       one voice assistant, owned by a teacher
 *   shareCodes/{code}                     time-limited code that gives access to one assistant
 *   studentAccess/{studentId_assistantId} a student's time-limited access after redeeming a code
 *   avatars/{id}                          small avatar images (resized in the browser before upload)
 *
 * All access goes through this file on the server; the browser never talks to
 * Firestore directly, so no Firestore security rules are needed beyond "deny all".
 */

export const ACCESS_HOURS = 24

export type Assistant = {
    id: string
    teacher_id: string
    name: string
    description: string | null
    system_instruction: string
    voice: string
    avatar_url: string | null
    created_at: string
    updated_at: string
}

/** What students (and the browser in general) may see. Never includes the instruction. */
export type AssistantSummary = Pick<Assistant, 'id' | 'name' | 'description' | 'avatar_url'>

export type AssistantInput = {
    name: string
    description: string | null
    system_instruction: string
    voice: string
    avatar_url: string | null
}

export type ShareCode = {
    id: string
    code: string
    assistant_id: string
    expires_at: string
    created_at: string
}

const iso = (value: unknown): string =>
    value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString()

function toAssistant(doc: DocumentSnapshot): Assistant {
    const d = doc.data()!
    return {
        id: doc.id,
        teacher_id: d.teacherId,
        name: d.name,
        description: d.description ?? null,
        system_instruction: d.systemInstruction ?? '',
        voice: d.voice,
        avatar_url: d.avatarUrl ?? null,
        created_at: iso(d.createdAt),
        updated_at: iso(d.updatedAt),
    }
}

export function toSummary(a: Assistant): AssistantSummary {
    return { id: a.id, name: a.name, description: a.description, avatar_url: a.avatar_url }
}

function hoursFromNow(hours: number): Timestamp {
    return Timestamp.fromMillis(Date.now() + hours * 60 * 60 * 1000)
}

// ---------------------------------------------------------------- assistants

export async function createAssistant(teacherId: string, input: AssistantInput): Promise<Assistant> {
    const now = Timestamp.now()
    const ref = await db().collection('assistants').add({
        teacherId,
        name: input.name,
        description: input.description,
        systemInstruction: input.system_instruction,
        voice: input.voice,
        avatarUrl: input.avatar_url,
        createdAt: now,
        updatedAt: now,
    })
    return toAssistant(await ref.get())
}

export async function getAssistant(id: string): Promise<Assistant | null> {
    if (!id || id.includes('/')) return null
    const doc = await db().collection('assistants').doc(id).get()
    return doc.exists ? toAssistant(doc) : null
}

/** The assistant, but only if this teacher owns it. */
export async function getOwnedAssistant(teacherId: string, id: string): Promise<Assistant | null> {
    const assistant = await getAssistant(id)
    return assistant && assistant.teacher_id === teacherId ? assistant : null
}

export async function listAssistantsByTeacher(teacherId: string): Promise<Assistant[]> {
    const snap = await db().collection('assistants').where('teacherId', '==', teacherId).get()
    return snap.docs.map(toAssistant).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function updateAssistant(teacherId: string, id: string, input: AssistantInput): Promise<Assistant | null> {
    const owned = await getOwnedAssistant(teacherId, id)
    if (!owned) return null
    const ref = db().collection('assistants').doc(id)
    await ref.update({
        name: input.name,
        description: input.description,
        systemInstruction: input.system_instruction,
        voice: input.voice,
        avatarUrl: input.avatar_url,
        updatedAt: Timestamp.now(),
    })
    return toAssistant(await ref.get())
}

/** Deletes the assistant together with its share codes and student access. */
export async function deleteAssistant(teacherId: string, id: string): Promise<boolean> {
    const owned = await getOwnedAssistant(teacherId, id)
    if (!owned) return false
    const [codes, access] = await Promise.all([
        db().collection('shareCodes').where('assistantId', '==', id).get(),
        db().collection('studentAccess').where('assistantId', '==', id).get(),
    ])
    const writer = db().bulkWriter()
    codes.docs.forEach(d => writer.delete(d.ref))
    access.docs.forEach(d => writer.delete(d.ref))
    writer.delete(db().collection('assistants').doc(id))
    await writer.close()
    return true
}

// --------------------------------------------------------------- share codes

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
    let code = ''
    for (let i = 0; i < 6; i++) code += CODE_CHARS[randomInt(CODE_CHARS.length)]
    return code
}

function toShareCode(doc: DocumentSnapshot): ShareCode {
    const d = doc.data()!
    return {
        id: doc.id,
        code: doc.id,
        assistant_id: d.assistantId,
        expires_at: iso(d.expiresAt),
        created_at: iso(d.createdAt),
    }
}

export async function createShareCode(teacherId: string, assistantId: string): Promise<ShareCode | null> {
    const owned = await getOwnedAssistant(teacherId, assistantId)
    if (!owned) return null

    for (let attempt = 0; attempt < 10; attempt++) {
        const ref = db().collection('shareCodes').doc(generateCode())
        try {
            // The code is the document id; reuse a code only if the old one has expired.
            await db().runTransaction(async tx => {
                const existing = await tx.get(ref)
                if (existing.exists && (existing.data()!.expiresAt as Timestamp).toMillis() > Date.now()) {
                    throw new Error('code-in-use')
                }
                tx.set(ref, {
                    assistantId,
                    teacherId,
                    expiresAt: hoursFromNow(ACCESS_HOURS),
                    createdAt: Timestamp.now(),
                })
            })
            return toShareCode(await ref.get())
        } catch (error) {
            if (!(error instanceof Error) || error.message !== 'code-in-use') throw error
        }
    }
    throw new Error('Kunne ikke lage en unik kode')
}

export async function listActiveShareCodes(teacherId: string, assistantId: string): Promise<ShareCode[]> {
    const owned = await getOwnedAssistant(teacherId, assistantId)
    if (!owned) return []
    const snap = await db().collection('shareCodes').where('assistantId', '==', assistantId).get()
    const now = new Date().toISOString()
    return snap.docs
        .map(toShareCode)
        .filter(c => c.expires_at > now)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// ------------------------------------------------------------ student access

const accessId = (studentId: string, assistantId: string) => `${studentId}_${assistantId}`

/** Returns the assistant id the code gives access to, or null if the code is invalid or expired. */
export async function redeemShareCode(studentId: string, rawCode: string): Promise<string | null> {
    const code = rawCode.trim().toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(code)) return null

    const doc = await db().collection('shareCodes').doc(code).get()
    if (!doc.exists) return null
    const data = doc.data()!
    if ((data.expiresAt as Timestamp).toMillis() <= Date.now()) return null

    const assistantId = data.assistantId as string
    await db().collection('studentAccess').doc(accessId(studentId, assistantId)).set({
        studentId,
        assistantId,
        grantedAt: Timestamp.now(),
        expiresAt: hoursFromNow(ACCESS_HOURS),
    })
    return assistantId
}

export async function hasStudentAccess(studentId: string, assistantId: string): Promise<boolean> {
    const doc = await db().collection('studentAccess').doc(accessId(studentId, assistantId)).get()
    return doc.exists && (doc.data()!.expiresAt as Timestamp).toMillis() > Date.now()
}

export async function listStudentAssistants(
    studentId: string,
): Promise<{ assistant: AssistantSummary; expires_at: string }[]> {
    const snap = await db().collection('studentAccess').where('studentId', '==', studentId).get()
    const active = snap.docs
        .map(d => ({ assistantId: d.data().assistantId as string, expires_at: iso(d.data().expiresAt) }))
        .filter(a => a.expires_at > new Date().toISOString())
    if (active.length === 0) return []

    const docs = await db().getAll(...active.map(a => db().collection('assistants').doc(a.assistantId)))
    return active
        .map((a, i) => (docs[i].exists ? { assistant: toSummary(toAssistant(docs[i])), expires_at: a.expires_at } : null))
        .filter(entry => entry !== null)
}

/**
 * The assistant if this user may talk to it: the teacher who owns it, or a
 * student with unexpired access from a share code. Otherwise null.
 */
export async function getAccessibleAssistant(
    user: Pick<SessionUser, 'id' | 'role'>,
    assistantId: string,
): Promise<Assistant | null> {
    const assistant = await getAssistant(assistantId)
    if (!assistant) return null
    if (assistant.teacher_id === user.id) return assistant
    if (await hasStudentAccess(user.id, assistantId)) return assistant
    return null
}

// ------------------------------------------------------------------- avatars

export const AVATAR_MAX_BYTES = 300 * 1024

export async function saveAvatar(ownerId: string, data: Buffer, contentType: string): Promise<string> {
    const ref = await db().collection('avatars').add({ ownerId, data, contentType, createdAt: Timestamp.now() })
    return ref.id
}

export async function getAvatar(id: string): Promise<{ data: Buffer; contentType: string } | null> {
    if (!id || id.includes('/')) return null
    const doc = await db().collection('avatars').doc(id).get()
    if (!doc.exists) return null
    const d = doc.data()!
    return { data: d.data as Buffer, contentType: d.contentType as string }
}
