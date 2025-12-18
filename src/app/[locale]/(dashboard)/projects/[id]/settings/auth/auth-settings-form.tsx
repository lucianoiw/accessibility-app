'use client'

import { useState, useTransition, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { Project, AuthType } from '@/types'
import { updateAuthSettings } from '../actions'

interface Props {
  project: Project
}

export function AuthSettingsForm({ project }: Props) {
  const t = useTranslations('SettingsForm')
  const [isPending, startTransition] = useTransition()
  const [authType, setAuthType] = useState<AuthType>(project.auth_config?.type || 'none')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await updateAuthSettings(project.id, formData)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: t('savedSuccess') })
      }
    })
  }

  const authTypeDescriptions = useMemo(() => ({
    none: t('authNoneDescription'),
    bearer: t('authBearerDescription'),
    cookie: t('authCookieDescription'),
  }), [t])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('authTitle')}</CardTitle>
        <CardDescription>
          {t('authDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="auth_type">{t('authType')}</Label>
            <Select
              name="auth_type"
              value={authType}
              onValueChange={(value) => setAuthType(value as AuthType)}
            >
              <SelectTrigger id="auth_type" className="w-full md:w-[300px]">
                <SelectValue placeholder={t('authType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('authNone')}</SelectItem>
                <SelectItem value="bearer">{t('authBearer')}</SelectItem>
                <SelectItem value="cookie">{t('authCookie')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {authTypeDescriptions[authType]}
            </p>
          </div>

          {/* Bearer Token fields */}
          {authType === 'bearer' && (
            <div className="space-y-2">
              <Label htmlFor="token">{t('bearerToken')}</Label>
              <Input
                id="token"
                name="token"
                type="password"
                defaultValue={project.auth_config?.token || ''}
                placeholder={t('bearerTokenPlaceholder')}
                required
              />
              <p className="text-sm text-muted-foreground">
                {t('bearerTokenHelp')}
              </p>
            </div>
          )}

          {/* Cookie fields */}
          {authType === 'cookie' && (
            <div className="space-y-2">
              <Label htmlFor="cookies">{t('cookies')}</Label>
              <Input
                id="cookies"
                name="cookies"
                defaultValue={project.auth_config?.cookies || ''}
                placeholder={t('cookiesPlaceholder')}
                required
              />
              <p className="text-sm text-muted-foreground">
                {t('cookiesHelp')}
              </p>
            </div>
          )}

          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('saveConfig')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
