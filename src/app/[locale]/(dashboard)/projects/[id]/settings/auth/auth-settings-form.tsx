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
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import type { Project, AuthType, AuthConfig } from '@/types'
import { updateAuthSettings } from '../actions'
import { parseCurl, type ParsedCurl } from '@/lib/curl-parser'

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
  const [curlCommand, setCurlCommand] = useState('')
  const [parsedCurl, setParsedCurl] = useState<ParsedCurl | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  // Parse cURL quando o comando muda
  function handleCurlChange(value: string) {
    setCurlCommand(value)
    if (value.trim().startsWith('curl')) {
      try {
        const parsed = parseCurl(value)
        setParsedCurl(parsed)
      } catch {
        setParsedCurl(null)
      }
    } else {
      setParsedCurl(null)
    }
  }

  function getAuthConfig(): AuthConfig | null {
    if (authType === 'none') return null
    if (authType === 'bearer') return { type: 'bearer', token: token || undefined }
    if (authType === 'cookie') return { type: 'cookie', cookies: cookies || undefined }
    if (authType === 'curl_import') {
      // Usar dados do novo cURL parseado, ou fallback para dados salvos
      if (parsedCurl) {
        return {
          type: 'curl_import',
          cookies: parsedCurl.cookieString || undefined,
          extraHeaders: parsedCurl.headers,
          userAgent: parsedCurl.userAgent || undefined,
        }
      }
      // Usar dados salvos anteriormente
      if (project.auth_config?.type === 'curl_import') {
        return {
          type: 'curl_import',
          cookies: project.auth_config.cookies,
          extraHeaders: project.auth_config.extraHeaders,
          userAgent: project.auth_config.userAgent,
        }
      }
    }
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

  const authTypeDescriptions: Record<AuthType, string> = useMemo(() => ({
    none: t('authNoneDescription'),
    bearer: t('authBearerDescription'),
    cookie: t('authCookieDescription'),
    curl_import: t('authCurlImportDescription'),
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
                <SelectItem value="curl_import">{t('authCurlImport')}</SelectItem>
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

          {/* cURL Import fields */}
          {authType === 'curl_import' && (
            <div className="space-y-4">
              {/* Mostrar configuração salva anteriormente */}
              {project.auth_config?.type === 'curl_import' && !parsedCurl && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md space-y-2 text-sm border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Configuração atual salva:</span>
                  </div>
                  <div className="grid gap-1 text-muted-foreground">
                    <p><span className="font-medium">Cookies:</span> {project.auth_config.cookies ? project.auth_config.cookies.split(';').length : 0} configurados</p>
                    <p><span className="font-medium">Headers:</span> {project.auth_config.extraHeaders ? Object.keys(project.auth_config.extraHeaders).length : 0} configurados</p>
                    {project.auth_config.userAgent && (
                      <p><span className="font-medium">User-Agent:</span> {project.auth_config.userAgent.substring(0, 50)}...</p>
                    )}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Cole um novo cURL abaixo para atualizar a configuração.
                  </p>
                  {/* Hidden inputs para manter dados salvos se não houver novo cURL */}
                  <input type="hidden" name="cookies" value={project.auth_config.cookies || ''} />
                  <input type="hidden" name="extra_headers" value={JSON.stringify(project.auth_config.extraHeaders || {})} />
                  <input type="hidden" name="user_agent" value={project.auth_config.userAgent || ''} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="curl_command">{t('curlCommand')}</Label>
                <Textarea
                  id="curl_command"
                  name="curl_command"
                  value={curlCommand}
                  onChange={(e) => handleCurlChange(e.target.value)}
                  placeholder={t('curlCommandPlaceholder')}
                  className="font-mono text-xs min-h-[150px]"
                />
                <p className="text-sm text-muted-foreground">
                  {t('curlCommandHelp')}
                </p>
              </div>

              {/* Parsed cURL info (novo) */}
              {parsedCurl && parsedCurl.url && (
                <div className="p-3 bg-muted rounded-md space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">{t('curlParsedSuccess')}</span>
                  </div>
                  <div className="grid gap-1 text-muted-foreground">
                    <p><span className="font-medium">URL:</span> {parsedCurl.url}</p>
                    <p><span className="font-medium">Cookies:</span> {Object.keys(parsedCurl.cookies).length} encontrados</p>
                    <p><span className="font-medium">Headers:</span> {Object.keys(parsedCurl.headers).length} encontrados</p>
                    {parsedCurl.userAgent && (
                      <p><span className="font-medium">User-Agent:</span> {parsedCurl.userAgent.substring(0, 50)}...</p>
                    )}
                  </div>
                  {/* Hidden inputs para enviar os dados parseados */}
                  <input type="hidden" name="cookies" value={parsedCurl.cookieString} />
                  <input type="hidden" name="extra_headers" value={JSON.stringify(parsedCurl.headers)} />
                  <input type="hidden" name="user_agent" value={parsedCurl.userAgent || ''} />
                </div>
              )}

              {curlCommand && !parsedCurl?.url && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-md flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{t('curlParseError')}</span>
                </div>
              )}
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
                  Auth: {testResult.authUsed === 'bearer' ? 'Bearer Token' : testResult.authUsed === 'cookie' ? 'Cookies' : testResult.authUsed === 'curl_import' ? 'cURL Import' : 'Nenhum'}
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
