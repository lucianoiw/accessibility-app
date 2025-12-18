'use client'

import { useState, useTransition, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import type { Project, AuthType, AuthConfig } from '@/types'
import { updateAuthSettings } from '../actions'

interface Props {
  project: Project
}

interface TestResult {
  success: boolean
  statusCode: number
  message: string
  hasLoginForm?: boolean
  testedUrl?: string
  finalUrl?: string
  wasRedirected?: boolean
  pageTitle?: string
  authUsed?: string
  headersSent?: Record<string, string>
  cookiesInjected?: number
  screenshot?: string
}

export function AuthSettingsForm({ project }: Props) {
  const t = useTranslations('SettingsForm')
  const [isPending, startTransition] = useTransition()
  const [authType, setAuthType] = useState<AuthType>(project.auth_config?.type || 'none')
  const [token, setToken] = useState(project.auth_config?.token || '')
  const [cookies, setCookies] = useState(project.auth_config?.cookies || '')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  function getAuthConfig(): AuthConfig | null {
    if (authType === 'none') return null
    if (authType === 'bearer') return { type: 'bearer', token: token || undefined }
    if (authType === 'cookie') return { type: 'cookie', cookies: cookies || undefined }
    return null
  }

  async function handleTest() {
    setIsTesting(true)
    setTestResult(null)

    try {
      const config = getAuthConfig()
      const response = await fetch(`/api/projects/${project.id}/auth/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authConfig: config }),
      })
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      console.error('Erro ao testar conexão:', error)
      setTestResult({
        success: false,
        statusCode: 0,
        message: 'Erro ao testar conexão',
      })
    } finally {
      setIsTesting(false)
    }
  }

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
                value={token}
                onChange={(e) => setToken(e.target.value)}
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
              <Textarea
                id="cookies"
                name="cookies"
                value={cookies}
                onChange={(e) => setCookies(e.target.value)}
                placeholder={t('cookiesPlaceholder')}
                className="font-mono text-xs min-h-[100px]"
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
            <Button type="submit" disabled={isPending || isTesting}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('saveConfig')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={isPending || isTesting}
            >
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </Button>
          </div>
        </form>

        {/* Test Result */}
        {testResult && (
          <div className="space-y-3 pt-4 mt-4 border-t">
            {/* Status message */}
            <div
              className={`p-3 rounded-md text-sm ${
                testResult.success && !testResult.hasLoginForm
                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200'
                  : testResult.success && testResult.hasLoginForm
                    ? 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 border border-yellow-200'
                    : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200'
              }`}
            >
              <p className="font-medium">
                {testResult.success && !testResult.hasLoginForm ? '✓' : testResult.success ? '⚠️' : '✗'}{' '}
                {testResult.message}
              </p>
              <div className="text-xs mt-2 space-y-1 opacity-75">
                {testResult.statusCode > 0 && (
                  <p>Status: {testResult.statusCode}</p>
                )}
                {testResult.testedUrl && (
                  <p className="break-all">URL testada: {testResult.testedUrl}</p>
                )}
                {testResult.wasRedirected && testResult.finalUrl && (
                  <p className="break-all">Redirecionado para: {testResult.finalUrl}</p>
                )}
                {testResult.pageTitle && (
                  <p>Título: {testResult.pageTitle}</p>
                )}
                <p>
                  Auth: {testResult.authUsed === 'bearer' ? 'Bearer Token' : testResult.authUsed === 'cookie' ? 'Cookies' : 'Nenhum'}
                  {testResult.cookiesInjected ? ` (${testResult.cookiesInjected} cookies)` : ''}
                </p>
              </div>
            </div>

            {/* Screenshot */}
            {testResult.screenshot && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Preview da página:</Label>
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <img
                    src={`data:image/png;base64,${testResult.screenshot}`}
                    alt="Screenshot da página testada"
                    className="w-full h-auto"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {testResult.hasLoginForm
                    ? '⚠️ A página parece conter um formulário de login. Verifique se a autenticação está configurada corretamente.'
                    : '✓ Página carregada com sucesso.'}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
