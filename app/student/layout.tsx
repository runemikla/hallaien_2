import { AppHeader } from '@/components/app-header'
import { requireUser } from '@/lib/session'

export default async function StudentLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const user = await requireUser('student')

    return (
        <div className="min-h-screen bg-background">
            <AppHeader user={user} home="/student" />
            {children}
        </div>
    )
}
