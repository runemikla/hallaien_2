import { Firestore } from '@google-cloud/firestore'

// One client per process (survives hot reload in development).
const globalForDb = globalThis as unknown as { __firestore?: Firestore }

/**
 * Firestore client. Credentials come from Application Default Credentials
 * (GOOGLE_APPLICATION_CREDENTIALS pointing at a service account key on the
 * server). With FIRESTORE_EMULATOR_HOST set, the local emulator is used.
 */
export function db(): Firestore {
    if (!globalForDb.__firestore) {
        globalForDb.__firestore = new Firestore({
            projectId: process.env.GOOGLE_CLOUD_PROJECT,
            databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
            ignoreUndefinedProperties: true,
        })
    }
    return globalForDb.__firestore
}
