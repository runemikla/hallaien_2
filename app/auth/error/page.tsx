import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  const denied = params?.error === 'AccessDenied'

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-[family-name:var(--font-roboto-slab)]">
              {denied ? 'Ingen tilgang' : 'Noe gikk galt'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {denied
                ? 'Du må logge inn med skolekontoen din (vlfk.no for lærere, iskule.no for elever). Private Google-kontoer har ikke tilgang.'
                : 'Innloggingen feilet. Prøv igjen.'}
            </p>
            <Button asChild>
              <Link href="/auth/login">Tilbake til innlogging</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
