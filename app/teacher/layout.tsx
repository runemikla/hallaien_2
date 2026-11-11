import { AppHeader } from '@/components/app-header'
import { requireUser } from '@/lib/session'

export default async function TeacherLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const user = await requireUser('teacher')

    return (
        <div className="min-h-screen bg-background">
            <AppHeader user={user} home="/teacher" />
            {children}
        </div>
    )
}
