'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import { TagsInput } from '@/components/ui/tags-input'
import type { SubdomainPolicy } from '@/types'

interface Props {
  projectId: string
  currentPolicy: SubdomainPolicy
  currentSubdomains: string[] | null
  baseDomain: string
}

export function SubdomainPolicyCard({
  projectId,
  currentPolicy,
  currentSubdomains,
  baseDomain,
}: Props) {
  const t = useTranslations('SubdomainPolicyConfig')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Form state
  const [policy, setPolicy] = useState<SubdomainPolicy>(currentPolicy)
  const [subdomains, setSubdomains] = useState<string[]>(currentSubdomains || [])

  // Extrair domínio base para mostrar exemplos
  const domain = (() => {
    try {
      const url = new URL(baseDomain)
      return url.hostname.replace(/^www\./, '')
    } catch {
      return baseDomain
    }
  })()

  async function handleSave() {
    setIsLoading(true)
    setIsSaved(false)

    try {
      const response = await fetch(`/api/projects/${projectId}/subdomain-policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomainPolicy: policy,
          allowedSubdomains: policy === 'specific' ? subdomains : null,
        }),
      })

      if (!response.ok) {
        throw new Error(t('saveError'))
      }

      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
      router.refresh()
    } catch (error) {
      console.error('Erro ao salvar subdomain policy:', error)
      alert(t('saveError'))
    } finally {
      setIsLoading(false)
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
        {/* Policy Type */}
        <div className="space-y-2">
          <Label>{t('behavior')}</Label>
          <Select value={policy} onValueChange={(v) => setPolicy(v as SubdomainPolicy)}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main_only">{t('mainOnly')}</SelectItem>
              <SelectItem value="all_subdomains">{t('allSubdomains')}</SelectItem>
              <SelectItem value="specific">{t('specific')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {policy === 'main_only' && (
              <>
                {t('mainOnlyDescription')}
                <br />
                Ex: <code className="bg-muted px-1 rounded">www.{domain}</code> e <code className="bg-muted px-1 rounded">{domain}</code>
              </>
            )}
            {policy === 'all_subdomains' && (
              <>
                {t('allSubdomainsDescription')}
                <br />
                Ex: <code className="bg-muted px-1 rounded">blog.{domain}</code>, <code className="bg-muted px-1 rounded">docs.{domain}</code>, <code className="bg-muted px-1 rounded">api.{domain}</code>
              </>
            )}
            {policy === 'specific' && (
              <>
                {t('specificDescription')}
              </>
            )}
          </p>
        </div>

        {/* Specific Subdomains */}
        {policy === 'specific' && (
          <div className="space-y-2 pt-2 border-t">
            <Label>{t('allowedSubdomains')}</Label>
            <TagsInput
              value={subdomains}
              onChange={setSubdomains}
              placeholder="blog ⏎  docs ⏎  api ⏎"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              <strong>{t('enterSubdomainHint')}</strong>
              <br />
              {t('exampleHint', { domain })} <kbd className="px-1.5 py-0.5 text-xs bg-muted border rounded">Enter</kbd>
            </p>
            {subdomains.length > 0 && (
              <div className="text-xs text-muted-foreground mt-2">
                <strong>{t('urlsFollowed')}:</strong>
                <ul className="list-disc list-inside mt-1">
                  <li><code className="bg-muted px-1 rounded">{domain}</code> ({t('mainDomain')})</li>
                  <li><code className="bg-muted px-1 rounded">www.{domain}</code> ({t('wwwAlwaysIncluded')})</li>
                  {subdomains.map((sub) => (
                    <li key={sub}><code className="bg-muted px-1 rounded">{sub}.{domain}</code></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? t('saving') : t('saveConfig')}
          </Button>
          {isSaved && (
            <span className="text-sm text-green-600">{t('savedSuccess')}</span>
          )}
        </div>

        {/* Current config display */}
        {currentPolicy !== 'main_only' && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {t('currentConfig')}:{' '}
              <span className="font-medium">
                {currentPolicy === 'all_subdomains'
                  ? t('allSubdomains')
                  : currentPolicy === 'specific'
                    ? t('specific')
                    : t('mainOnly')}
              </span>
              {currentPolicy === 'specific' && currentSubdomains && currentSubdomains.length > 0 && (
                <span className="ml-2">
                  ({currentSubdomains.join(', ')})
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
