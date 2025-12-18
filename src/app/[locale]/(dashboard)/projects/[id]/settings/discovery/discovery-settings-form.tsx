'use client'

import { useState, useMemo, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, AlertTriangle, Upload } from 'lucide-react'
import type { Project, DiscoveryMethod, DiscoveryConfig, ManualDiscoveryConfig, SitemapDiscoveryConfig, CrawlerDiscoveryConfig } from '@/types'
import { updateDiscoverySettings } from '../actions'

interface Props {
  project: Project
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

export function DiscoverySettingsForm({ project }: Props) {
  const t = useTranslations('SettingsForm')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Discovery method state
  const [discoveryMethod, setDiscoveryMethod] = useState<DiscoveryMethod>(
    project.discovery_method || 'crawler'
  )

  // Manual mode state
  const initialManualUrls = project.discovery_method === 'manual'
    ? getManualConfig(project.discovery_config).urls?.join('\n') || ''
    : ''
  const [manualUrls, setManualUrls] = useState(initialManualUrls)

  // Sitemap mode state
  const initialSitemapUrl = project.discovery_method === 'sitemap'
    ? getSitemapConfig(project.discovery_config).sitemapUrl || ''
    : ''
  const initialSitemapMaxPages = project.discovery_method === 'sitemap'
    ? getSitemapConfig(project.discovery_config).maxPages || 100
    : 100
  const [sitemapUrl, setSitemapUrl] = useState(initialSitemapUrl)
  const [sitemapMaxPages, setSitemapMaxPages] = useState(initialSitemapMaxPages)

  // Crawler mode state
  const initialCrawlerStartUrl = project.discovery_method === 'crawler'
    ? getCrawlerConfig(project.discovery_config).startUrl || project.base_url
    : project.base_url
  const initialCrawlerDepth = project.discovery_method === 'crawler'
    ? String(getCrawlerConfig(project.discovery_config).depth || 2) as '1' | '2' | '3'
    : '2'
  const initialCrawlerMaxPages = project.discovery_method === 'crawler'
    ? getCrawlerConfig(project.discovery_config).maxPages || 100
    : 100
  const initialCrawlerExcludePaths = project.discovery_method === 'crawler'
    ? getCrawlerConfig(project.discovery_config).excludePaths?.join('\n') || ''
    : ''

  const [crawlerStartUrl, setCrawlerStartUrl] = useState(initialCrawlerStartUrl)
  const [crawlerDepth, setCrawlerDepth] = useState<'1' | '2' | '3'>(initialCrawlerDepth)
  const [crawlerMaxPages, setCrawlerMaxPages] = useState(initialCrawlerMaxPages)
  const [crawlerExcludePaths, setCrawlerExcludePaths] = useState(initialCrawlerExcludePaths)

  // Parse manual URLs
  const parsedManualUrls = useMemo(() => {
    return manualUrls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => {
        try {
          new URL(url)
          return true
        } catch {
          return false
        }
      })
  }, [manualUrls])

  // Parse exclude paths
  const parsedExcludePaths = useMemo(() => {
    return crawlerExcludePaths
      .split('\n')
      .map((path) => path.trim())
      .filter((path) => path.length > 0)
  }, [crawlerExcludePaths])

  // Validate discovery config
  const isDiscoveryValid = useMemo(() => {
    switch (discoveryMethod) {
      case 'manual':
        return parsedManualUrls.length > 0
      case 'sitemap':
        try {
          new URL(sitemapUrl)
          return sitemapMaxPages >= 1 && sitemapMaxPages <= 500
        } catch {
          return false
        }
      case 'crawler':
        try {
          new URL(crawlerStartUrl)
          return crawlerMaxPages >= 1 && crawlerMaxPages <= 500
        } catch {
          return false
        }
      default:
        return false
    }
  }, [
    discoveryMethod,
    parsedManualUrls,
    sitemapUrl,
    sitemapMaxPages,
    crawlerStartUrl,
    crawlerMaxPages,
  ])

  // Build discovery config based on method
  function buildDiscoveryConfig(): DiscoveryConfig {
    switch (discoveryMethod) {
      case 'manual':
        return { urls: parsedManualUrls }
      case 'sitemap':
        return { sitemapUrl, maxPages: sitemapMaxPages }
      case 'crawler':
        return {
          startUrl: crawlerStartUrl,
          depth: parseInt(crawlerDepth) as 1 | 2 | 3,
          maxPages: crawlerMaxPages,
          excludePaths: parsedExcludePaths.length > 0 ? parsedExcludePaths : undefined,
        }
    }
  }

  async function handleSubmit() {
    setMessage(null)

    if (!isDiscoveryValid) {
      setMessage({ type: 'error', text: t('invalidConfig') })
      return
    }

    startTransition(async () => {
      const result = await updateDiscoverySettings(project.id, {
        discoveryMethod,
        discoveryConfig: buildDiscoveryConfig(),
      })

      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: t('savedSuccess') })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('discoveryTitle')}</CardTitle>
        <CardDescription>
          {t('discoveryDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Tabs
            value={discoveryMethod}
            onValueChange={(v) => setDiscoveryMethod(v as DiscoveryMethod)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual">{t('manual')}</TabsTrigger>
              <TabsTrigger value="sitemap">{t('sitemap')}</TabsTrigger>
              <TabsTrigger value="crawler">{t('crawler')}</TabsTrigger>
            </TabsList>

            {/* Manual Tab */}
            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('specificUrls')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('specificUrlsDescription')}
                </p>
                <Textarea
                  placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/about"
                  value={manualUrls}
                  onChange={(e) => setManualUrls(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  disabled={isPending}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('validUrls')}: {parsedManualUrls.length}
                  </span>
                  <Button variant="outline" size="sm" disabled className="gap-2">
                    <Upload className="h-4 w-4" />
                    {t('importFile')}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Sitemap Tab */}
            <TabsContent value="sitemap" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="sitemap-url" className="text-sm font-medium">
                  {t('sitemapUrl')}
                </Label>
                <Input
                  id="sitemap-url"
                  type="url"
                  placeholder="https://example.com/sitemap.xml"
                  value={sitemapUrl}
                  onChange={(e) => setSitemapUrl(e.target.value)}
                  disabled={isPending}
                />
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" disabled className="gap-2">
                    <Upload className="h-4 w-4" />
                    {t('importFile')}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sitemap-max-pages" className="text-sm font-medium">
                  {t('pageLimit')}
                </Label>
                <Input
                  id="sitemap-max-pages"
                  type="number"
                  min={1}
                  max={500}
                  value={sitemapMaxPages}
                  onChange={(e) => setSitemapMaxPages(parseInt(e.target.value) || 1)}
                  className="w-full"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  {t('pageLimitDescription')}
                </p>
                {sitemapMaxPages > 200 && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs">
                      {t('pageLimitWarning')}
                    </span>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Crawler Tab */}
            <TabsContent value="crawler" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="crawler-start-url" className="text-sm font-medium">
                  {t('startUrl')}
                </Label>
                <Input
                  id="crawler-start-url"
                  type="url"
                  placeholder={project.base_url}
                  value={crawlerStartUrl}
                  onChange={(e) => setCrawlerStartUrl(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  {t('startUrlDescription')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="crawler-max-pages" className="text-sm font-medium">
                  {t('pageLimit')}
                </Label>
                <Input
                  id="crawler-max-pages"
                  type="number"
                  min={1}
                  max={500}
                  value={crawlerMaxPages}
                  onChange={(e) => setCrawlerMaxPages(parseInt(e.target.value) || 1)}
                  className="w-full"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  {t('pageLimitDescription')}
                </p>
                {crawlerMaxPages > 200 && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs">
                      {t('pageLimitWarning')}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('depth')}</Label>
                <RadioGroup
                  value={crawlerDepth}
                  onValueChange={(v) => setCrawlerDepth(v as '1' | '2' | '3')}
                  className="grid gap-2"
                  disabled={isPending}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="depth-1" />
                    <Label htmlFor="depth-1" className="text-sm font-normal cursor-pointer">
                      {t('depth1')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="depth-2" />
                    <Label htmlFor="depth-2" className="text-sm font-normal cursor-pointer">
                      {t('depth2')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="depth-3" />
                    <Label htmlFor="depth-3" className="text-sm font-normal cursor-pointer">
                      {t('depth3')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('excludePaths')}</Label>
                <Textarea
                  placeholder="/admin/*&#10;/api/*&#10;/login"
                  value={crawlerExcludePaths}
                  onChange={(e) => setCrawlerExcludePaths(e.target.value)}
                  rows={3}
                  className="font-mono text-sm"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  {t('excludePathsDescription')}
                </p>
              </div>
            </TabsContent>
          </Tabs>

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
            <Button onClick={handleSubmit} disabled={isPending || !isDiscoveryValid}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('saveConfig')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
