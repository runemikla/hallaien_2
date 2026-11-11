export type Role = 'teacher' | 'student'

function domains(value: string | undefined, fallback: string): string[] {
    return (value || fallback).split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
}

/**
 * Role is decided by the Google Workspace domain of the account:
 * teachers sign in with vlfk.no and students with iskule.no (override with
 * TEACHER_DOMAINS / STUDENT_DOMAINS). Any other domain gets no access.
 */
export function roleForDomain(domain: string | null | undefined): Role | null {
    if (!domain) return null
    const d = domain.toLowerCase()
    if (domains(process.env.TEACHER_DOMAINS, 'vlfk.no').includes(d)) return 'teacher'
    if (domains(process.env.STUDENT_DOMAINS, 'iskule.no').includes(d)) return 'student'
    return null
}
