import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { UserMenu } from '@/components/user-menu'

export default async function TeacherLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get profile and verify role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name, avatar_url')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'teacher') {
        redirect('/student')
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/teacher" className="flex items-center gap-3">
                        <Image
                            src="/VLFK/VLFK-logo.png"
                            alt="Vestland fylkeskommune"
                            width={100}
                            height={32}
                            className="h-8 w-auto"
                        />
                    </Link>

                    <UserMenu
                        email={user.email || ''}
                        firstName={profile?.first_name}
                        avatarUrl={profile?.avatar_url}
                    />
                </div>
            </header>
            {children}
        </div>
    )
}
