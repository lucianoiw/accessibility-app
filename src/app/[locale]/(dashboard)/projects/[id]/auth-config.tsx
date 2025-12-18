'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AuthConfig, AuthType } from '@/types'

interface Props {
  projectId: string
  currentConfig: AuthConfig | null
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
  screenshot?: string // base64
}

export function AuthConfigCard({ projectId, currentConfig }: Props) {
  const t = useTranslations('AuthConfig')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  // Form state
  const [authType, setAuthType] = useState<AuthType>(currentConfig?.type || 'none')
  const [token, setToken] = useState(currentConfig?.token || '')
  const [cookies, setCookies] = useState(currentConfig?.cookies || '')

  function getAuthConfig(): AuthConfig | null {
    if (authType === 'none') return null
    if (authType === 'bearer') {
      return { type: 'bearer', token: token || undefined }
    }
    if (authType === 'cookie') {
      return { type: 'cookie', cookies: cookies || undefined }
    }
    return null
  }

  async function handleSave() {
    setIsLoading(true)
    setIsSaved(false)

    try {
      const config = getAuthConfig()

      const response = await fetch(`/api/projects/${projectId}/auth`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authConfig: config }),
      })

      if (!response.ok) {
        throw new Error(t('saveError'))
      }

      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
      router.refresh()
    } catch (error) {
      console.error('Erro ao salvar auth config:', error)
      alert(t('saveError'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleTest() {
    setIsTesting(true)
    setTestResult(null)

    try {
      const config = getAuthConfig()

      const response = await fetch(`/api/projects/${projectId}/auth/test`, {
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
        message: t('testConnectionError'),
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auth Type */}
        <div className="space-y-2">
          <Label>{t('authType')}</Label>
          <Select value={authType} onValueChange={(v) => setAuthType(v as AuthType)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noAuth')}</SelectItem>
              <SelectItem value="bearer">{t('bearerToken')}</SelectItem>
              <SelectItem value="cookie">{t('cookies')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {authType === 'none' && t('noAuthDescription')}
            {authType === 'bearer' && t('bearerDescription')}
            {authType === 'cookie' && t('cookieDescription')}
          </p>
        </div>

        {/* Bearer Token Config */}
        {authType === 'bearer' && (
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="token">{t('token')}</Label>
            <Input
              id="token"
              type="password"
              placeholder={t('tokenPlaceholder')}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="max-w-md font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t('tokenHelp')} <code className="bg-muted px-1 rounded">Authorization: Bearer {'<token>'}</code>
            </p>
          </div>
        )}

        {/* Cookie Config */}
        {authType === 'cookie' && (
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="cookies">{t('cookiesLabel')}</Label>
            <Textarea
              id="cookies"
              placeholder="token=eyJhbG...; sessionId=abc123; ..."
              value={cookies}
              onChange={(e) => setCookies(e.target.value)}
              className="font-mono text-xs min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              {t('cookiesFormat')} <code className="bg-muted px-1 rounded">nome1=valor1; nome2=valor2</code>
            </p>
            <p className="text-xs text-muted-foreground">
              {t('cookiesHowTo')}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4">
          <Button onClick={handleSave} disabled={isLoading || isTesting}>
            {isLoading ? t('saving') : t('saveConfig')}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={isLoading || isTesting}
          >
            {isTesting ? t('testing') : t('testConnection')}
          </Button>
          {isSaved && (
            <span className="text-sm text-green-600">{t('savedSuccess')}</span>
          )}
        </div>

        {/* Test Result */}
        {testResult && (
          <div className="space-y-3 pt-4 border-t">
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
                  <p className="break-all">{t('testedUrl')}: {testResult.testedUrl}</p>
                )}
                {testResult.wasRedirected && testResult.finalUrl && (
                  <p className="break-all">{t('redirectedTo')}: {testResult.finalUrl}</p>
                )}
                {testResult.pageTitle && (
                  <p>{t('pageTitle')}: {testResult.pageTitle}</p>
                )}
                <p>
                  Auth: {testResult.authUsed === 'bearer' ? 'Bearer Token' : testResult.authUsed === 'cookie' ? 'Cookies' : t('none')}
                  {testResult.cookiesInjected ? ` (${testResult.cookiesInjected} cookies)` : ''}
                </p>
                {testResult.headersSent && Object.keys(testResult.headersSent).length > 0 && (
                  <div className="mt-2 p-2 bg-black/10 rounded font-mono text-xs">
                    <p className="font-bold mb-1">{t('headersSent')}:</p>
                    {Object.entries(testResult.headersSent).map(([key, value]) => (
                      <p key={key}>
                        {key}: {key === 'Authorization' ? value.substring(0, 30) + '...' : value}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Screenshot */}
            {testResult.screenshot && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('pagePreview')}:</Label>
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <img
                    src={`data:image/png;base64,${testResult.screenshot}`}
                    alt={t('screenshotAlt')}
                    className="w-full h-auto"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {testResult.hasLoginForm
                    ? t('loginFormWarning')
                    : t('pageLoadedSuccess')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Current config display */}
        {currentConfig && currentConfig.type !== 'none' && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {t('currentConfig')}:{' '}
              <span className="font-medium">
                {currentConfig.type === 'bearer' ? 'Bearer Token' : currentConfig.type === 'cookie' ? 'Cookies' : currentConfig.type}
              </span>
              {currentConfig.token && (
                <span className="ml-2">
                  (Token: {currentConfig.token.substring(0, 10)}...)
                </span>
              )}
              {currentConfig.cookies && (
                <span className="ml-2">
                  ({currentConfig.cookies.split(';').length} cookies)
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
