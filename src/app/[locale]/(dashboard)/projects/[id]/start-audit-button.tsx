'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Settings, FileText, Globe, Search } from 'lucide-react'
import type { DiscoveryMethod, DiscoveryConfig, ManualDiscoveryConfig, SitemapDiscoveryConfig, CrawlerDiscoveryConfig } from '@/types'

interface Props {
  projectId: string
  discoveryMethod: DiscoveryMethod
  discoveryConfig: DiscoveryConfig
  defaults: {
    wcagLevels: string[]
    maxPages: number
    includeAbnt: boolean
    includeEmag: boolean
    includeCoga: boolean
  }
}

// Helper para extrair config tipada
function getManualConfig(config: DiscoveryConfig): ManualDiscoveryConfig {
  return config as ManualDiscoveryConfig
}

function getSitemapConfig(config: DiscoveryConfig): SitemapDiscoveryConfig {
  return config as SitemapDiscoveryConfig
}

function getCrawlerConfig(config: DiscoveryConfig): CrawlerDiscoveryConfig {
  return config as CrawlerDiscoveryConfig
}

// Descrição do método de descoberta
function getDiscoveryDescription(method: DiscoveryMethod, config: DiscoveryConfig, t: (key: string, params?: Record<string, string | number>) => string): string {
  switch (method) {
    case 'manual': {
      const manualConfig = getManualConfig(config)
      const count = manualConfig.urls?.length || 0
      return t('manualPages', { count })
    }
    case 'sitemap': {
      const sitemapConfig = getSitemapConfig(config)
      return t('sitemapPages', { maxPages: sitemapConfig.maxPages || 100 })
    }
    case 'crawler': {
      const crawlerConfig = getCrawlerConfig(config)
      return t('crawlerPages', { maxPages: crawlerConfig.maxPages || 100, depth: crawlerConfig.depth || 2 })
    }
  }
}

// Ícone do método de descoberta
function getDiscoveryIcon(method: DiscoveryMethod) {
  switch (method) {
    case 'manual':
      return FileText
    case 'sitemap':
      return Globe
    case 'crawler':
      return Search
  }
}

export function StartAuditButton({ projectId, discoveryMethod, discoveryConfig, defaults }: Props) {
  const t = useTranslations('StartAudit')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const DiscoveryIcon = getDiscoveryIcon(discoveryMethod)
  const discoveryDescription = getDiscoveryDescription(discoveryMethod, discoveryConfig, t)

  async function handleStartAudit() {
    setIsLoading(true)

    try {
      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('startError'))
      }

      const { auditId } = await response.json()
      setOpen(false)
      router.push(`/projects/${projectId}/audits/${auditId}`)
    } catch (error) {
      console.error('Erro ao iniciar auditoria:', error)
      alert(error instanceof Error ? error.message : t('startError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t('startAudit')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Discovery Config Summary */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DiscoveryIcon className="h-4 w-4 text-muted-foreground" />
              <span>{t('pageDiscovery')}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {discoveryDescription}
            </p>
          </div>

          {/* Analysis Config Summary */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="text-sm font-medium">{t('analysisConfig')}</div>
            <div className="flex flex-wrap gap-2">
              {defaults.wcagLevels.map((level) => (
                <span
                  key={level}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary"
                >
                  WCAG {level}
                </span>
              ))}
              {defaults.includeAbnt && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                  ABNT
                </span>
              )}
              {defaults.includeEmag && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  eMAG
                </span>
              )}
              {defaults.includeCoga && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                  COGA
                </span>
              )}
            </div>
          </div>

          {/* Edit Settings Link */}
          <div className="flex items-center justify-center">
            <Button variant="link" size="sm" asChild className="text-muted-foreground">
              <Link href={`/projects/${projectId}/settings/discovery`}>
                <Settings className="h-3 w-3 mr-1" />
                {t('editSettings')}
              </Link>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleStartAudit} disabled={isLoading}>
            {isLoading ? t('starting') : t('startAudit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
