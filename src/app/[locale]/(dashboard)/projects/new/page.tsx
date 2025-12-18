'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AlertTriangle, Upload } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { DiscoveryMethod, DiscoveryConfig } from '@/types'

// Extrai o domínio base de uma URL
function extractBaseUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return null
  }
}

export default function NewProjectPage() {
  const t = useTranslations('Project')
  const tCommon = useTranslations('Common')
  const router = useRouter()
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Basic project info
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Discovery method state
  const [discoveryMethod, setDiscoveryMethod] = useState<DiscoveryMethod>('crawler')

  // Manual mode state
  const [manualUrls, setManualUrls] = useState('')

  // Sitemap mode state
  const [sitemapUrl, setSitemapUrl] = useState('')
  const [sitemapMaxPages, setSitemapMaxPages] = useState(100)

  // Crawler mode state
  const [crawlerStartUrl, setCrawlerStartUrl] = useState('')
  const [crawlerDepth, setCrawlerDepth] = useState<'1' | '2' | '3'>('2')
  const [crawlerMaxPages, setCrawlerMaxPages] = useState(100)
  const [crawlerExcludePaths, setCrawlerExcludePaths] = useState('')

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

  // Derive base URL from discovery config
  const derivedBaseUrl = useMemo(() => {
    switch (discoveryMethod) {
      case 'manual':
        return parsedManualUrls.length > 0 ? extractBaseUrl(parsedManualUrls[0]) : null
      case 'sitemap':
        return extractBaseUrl(sitemapUrl)
      case 'crawler':
        return extractBaseUrl(crawlerStartUrl)
      default:
        return null
    }
  }, [discoveryMethod, parsedManualUrls, sitemapUrl, crawlerStartUrl])

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate discovery config
    if (!isDiscoveryValid) {
      setError(t('errors.invalidDiscovery'))
      setIsLoading(false)
      return
    }

    // Validate derived base URL
    if (!derivedBaseUrl) {
      setError(t('errors.cannotExtractDomain'))
      setIsLoading(false)
      return
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError(t('errors.loginRequired'))
      setIsLoading(false)
      return
    }

    // Build discovery config
    const discoveryConfig = buildDiscoveryConfig()

    // Create project
    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        base_url: derivedBaseUrl,
        description: description || null,
        discovery_method: discoveryMethod,
        discovery_config: discoveryConfig,
      } as never)
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setIsLoading(false)
      return
    }

    router.push(`/projects/${(data as { id: string }).id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t('newProject')}</CardTitle>
          <CardDescription>
            {t('newProjectDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('form.name')}</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t('form.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('form.descriptionOptional')}</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder={t('form.descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Discovery Method */}
            <div className="border-t pt-6 space-y-4">
              <div>
                <Label className="text-base font-semibold">{t('discovery.title')}</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('discovery.description')}
                </p>
              </div>

              <Tabs
                value={discoveryMethod}
                onValueChange={(v) => setDiscoveryMethod(v as DiscoveryMethod)}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="manual">{t('discovery.manual')}</TabsTrigger>
                  <TabsTrigger value="sitemap">{t('discovery.sitemap')}</TabsTrigger>
                  <TabsTrigger value="crawler">{t('discovery.crawler')}</TabsTrigger>
                </TabsList>

                {/* Manual Tab */}
                <TabsContent value="manual" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('discovery.specificUrls')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('discovery.specificUrlsDescription')}
                    </p>
                    <Textarea
                      placeholder="https://example.com/&#10;https://example.com/about&#10;https://example.com/contact"
                      value={manualUrls}
                      onChange={(e) => setManualUrls(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                      disabled={isLoading}
                    />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t('discovery.validUrls')}: {parsedManualUrls.length}
                      </span>
                      <Button variant="outline" size="sm" disabled className="gap-2">
                        <Upload className="h-4 w-4" />
                        {t('discovery.importFile')}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Sitemap Tab */}
                <TabsContent value="sitemap" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="sitemap-url" className="text-sm font-medium">
                      {t('discovery.sitemapUrl')}
                    </Label>
                    <Input
                      id="sitemap-url"
                      type="url"
                      placeholder="https://example.com/sitemap.xml"
                      value={sitemapUrl}
                      onChange={(e) => setSitemapUrl(e.target.value)}
                      disabled={isLoading}
                    />
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" disabled className="gap-2">
                        <Upload className="h-4 w-4" />
                        {t('discovery.importFile')}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sitemap-max-pages" className="text-sm font-medium">
                      {t('discovery.pageLimit')}
                    </Label>
                    <Input
                      id="sitemap-max-pages"
                      type="number"
                      min={1}
                      max={500}
                      value={sitemapMaxPages}
                      onChange={(e) => setSitemapMaxPages(parseInt(e.target.value) || 1)}
                      className="w-full"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('discovery.pageLimitDescription')}
                    </p>
                    {sitemapMaxPages > 200 && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs">
                          {t('discovery.pageLimitWarning')}
                        </span>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Crawler Tab */}
                <TabsContent value="crawler" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="crawler-start-url" className="text-sm font-medium">
                      {t('discovery.startUrl')}
                    </Label>
                    <Input
                      id="crawler-start-url"
                      type="url"
                      placeholder="https://example.com/"
                      value={crawlerStartUrl}
                      onChange={(e) => setCrawlerStartUrl(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('discovery.startUrlDescription')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="crawler-max-pages" className="text-sm font-medium">
                      {t('discovery.pageLimit')}
                    </Label>
                    <Input
                      id="crawler-max-pages"
                      type="number"
                      min={1}
                      max={500}
                      value={crawlerMaxPages}
                      onChange={(e) => setCrawlerMaxPages(parseInt(e.target.value) || 1)}
                      className="w-full"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('discovery.pageLimitDescription')}
                    </p>
                    {crawlerMaxPages > 200 && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs">
                          {t('discovery.pageLimitWarning')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">{t('discovery.depth')}</Label>
                    <RadioGroup
                      value={crawlerDepth}
                      onValueChange={(v) => setCrawlerDepth(v as '1' | '2' | '3')}
                      className="grid gap-2"
                      disabled={isLoading}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id="depth-1" />
                        <Label htmlFor="depth-1" className="text-sm font-normal cursor-pointer">
                          {t('discovery.depth1')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id="depth-2" />
                        <Label htmlFor="depth-2" className="text-sm font-normal cursor-pointer">
                          {t('discovery.depth2')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="3" id="depth-3" />
                        <Label htmlFor="depth-3" className="text-sm font-normal cursor-pointer">
                          {t('discovery.depth3')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('discovery.excludePaths')}</Label>
                    <Textarea
                      placeholder="/admin/*&#10;/api/*&#10;/login"
                      value={crawlerExcludePaths}
                      onChange={(e) => setCrawlerExcludePaths(e.target.value)}
                      rows={3}
                      className="font-mono text-sm"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('discovery.excludePathsDescription')}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Show derived base URL */}
              {derivedBaseUrl && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  {t('discovery.domain')}: <span className="font-mono">{derivedBaseUrl}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading || !name || !isDiscoveryValid}>
                {isLoading ? tCommon('creating') : t('createProject')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/projects">{tCommon('cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
