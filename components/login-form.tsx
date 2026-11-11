'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LoginFormProps = React.ComponentPropsWithoutRef<'div'> & { devLogin?: boolean }

export function LoginForm({ className, devLogin = false, ...props }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [devEmail, setDevEmail] = useState('')

  const handleGoogle = async () => {
    setIsLoading(true)
    await signIn('google', { redirectTo: '/dashboard' })
  }

  const handleDev = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await signIn('dev', { email: devEmail, redirectTo: '/dashboard' })
    setIsLoading(false)
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-[family-name:var(--font-roboto-slab)]">Logg inn</CardTitle>
          <CardDescription>
            Bruk skolekontoen din. Lærere logger inn med vlfk.no og elever med iskule.no.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Button onClick={handleGoogle} className="w-full" disabled={isLoading}>
            {isLoading ? 'Logger inn...' : 'Logg inn med Google'}
          </Button>

          {devLogin && (
            <form onSubmit={handleDev} className="flex flex-col gap-3 border-t pt-6">
              <Label htmlFor="dev-email">Utviklerinnlogging (kun lokalt)</Label>
              <Input
                id="dev-email"
                type="email"
                placeholder="test@vlfk.no eller test@iskule.no"
                required
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
              />
              <Button type="submit" variant="outline" disabled={isLoading}>
                Logg inn uten Google
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
