'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  SkipForward,
  Image,
  Link2,
  Hand,
  Keyboard,
  Contrast,
  FileText,
  Layout,
  PlayCircle,
} from 'lucide-react'
import type { IGTCategory, IGTStatus } from '@/lib/igt/types'

interface IGTListProps {
  auditId: string
  projectId: string
  baseUrl: string
  violations: Array<{
    id: string
    rule_id: string
    fingerprint: string
    selector: string
    help: string
    affected_pages: string[]
    unique_elements: unknown[]
  }>
  sessions: Array<{
    id: string
    igt_id: string
    status: IGTStatus
    current_candidate_index: number
    total_candidates: number
    results: unknown[]
    completed_at: string | null
  }>
  pages: string[]
  includeEmag: boolean
  includeCoga: boolean
}

// IGT definitions (hardcoded for now, should come from registry)
const IGT_DEFINITIONS = [
  {
    id: 'images-alt-quality',
    category: 'images' as IGTCategory,
    wcagCriteria: ['1.1.1'],
    emagRecommendations: ['3.6'],
    estimatedMinutes: 5,
    relevantRuleIds: ['image-alt', 'imagem-alt-nome-arquivo', 'image-redundant-alt'],
  },
  {
    id: 'links-purpose',
    category: 'links' as IGTCategory,
    wcagCriteria: ['2.4.4'],
    emagRecommendations: ['3.5'],
    estimatedMinutes: 5,
    relevantRuleIds: ['link-texto-generico', 'link-name', 'rotulo-curto-ambiguo'],
  },
  {
    id: 'sign-language-plugin',
    category: 'sign-language' as IGTCategory,
    wcagCriteria: ['1.2.6'],
    emagRecommendations: ['5.4'],
    estimatedMinutes: 3,
    relevantRuleIds: ['brasil-libras-plugin'],
  },
]

const CATEGORY_ICONS: Record<IGTCategory, typeof Image> = {
  images: Image,
  links: Link2,
  forms: FileText,
  keyboard: Keyboard,
  'sign-language': Hand,
  contrast: Contrast,
  structure: Layout,
  multimedia: PlayCircle,
}

const STATUS_CONFIG = {
  not_started: {
    color: 'bg-gray-100 text-gray-700',
    icon: Play,
  },
  in_progress: {
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
  },
  completed: {
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
  skipped: {
    color: 'bg-gray-100 text-gray-500',
    icon: SkipForward,
  },
}

export function IGTList({
  auditId,
  projectId,
  baseUrl,
  violations,
  sessions,
  pages,
  includeEmag,
  includeCoga,
}: IGTListProps) {
  const t = useTranslations('IGT')

  // Build IGT cards with context
  const igtCards = useMemo(() => {
    return IGT_DEFINITIONS.map(igt => {
      // Find session for this IGT
      const session = sessions.find(s => s.igt_id === igt.id)

      // Count relevant violations
      const relevantViolations = violations.filter(v =>
        igt.relevantRuleIds.includes(v.rule_id)
      )

      // Calculate candidate count (simplified)
      const candidateCount = relevantViolations.length || 0

      // Check if relevant (has candidates or is sign-language for gov.br)
      const isGovBr = baseUrl.includes('.gov.br')
      const isRelevant = candidateCount > 0 || (igt.id === 'sign-language-plugin' && isGovBr)

      // Progress
      const progress = session
        ? Math.round((session.current_candidate_index / Math.max(session.total_candidates, 1)) * 100)
        : 0

      // Results summary
      const results = (session?.results || []) as Array<{ result: string }>
      const failCount = results.filter(r => r.result === 'fail').length
      const warningCount = results.filter(r => r.result === 'warning').length

      return {
        ...igt,
        session,
        candidateCount,
        isRelevant,
        progress,
        failCount,
        warningCount,
      }
    }).filter(igt => igt.isRelevant)
  }, [violations, sessions, baseUrl])

  if (igtCards.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{t('noIGTsAvailable')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {igtCards.map(igt => {
        const CategoryIcon = CATEGORY_ICONS[igt.category]
        const status = igt.session?.status || 'not_started'
        const StatusConfig = STATUS_CONFIG[status]
        const StatusIcon = StatusConfig.icon

        return (
          <Card key={igt.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-muted rounded-lg">
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t(`${igt.id}.name`)}</CardTitle>
                    <CardDescription className="text-xs">
                      WCAG {igt.wcagCriteria.join(', ')}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={StatusConfig.color} variant="outline">
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {t(`status.${status}`)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {t(`${igt.id}.description`)}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{igt.estimatedMinutes} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span>{igt.candidateCount} {t('candidates')}</span>
                </div>
              </div>

              {/* Progress (if in progress or completed) */}
              {igt.session && status !== 'not_started' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{t('progress')}</span>
                    <span>{igt.progress}%</span>
                  </div>
                  <Progress value={igt.progress} className="h-2" />
                </div>
              )}

              {/* Results (if completed) */}
              {status === 'completed' && (igt.failCount > 0 || igt.warningCount > 0) && (
                <div className="flex gap-2">
                  {igt.failCount > 0 && (
                    <Badge variant="destructive">
                      {igt.failCount} {t('issues')}
                    </Badge>
                  )}
                  {igt.warningCount > 0 && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      {igt.warningCount} {t('warnings')}
                    </Badge>
                  )}
                </div>
              )}

              {/* Action button */}
              <div className="mt-auto pt-2">
                <Link href={`/projects/${projectId}/audits/${auditId}/igt/${igt.id}`}>
                  <Button className="w-full" variant={status === 'not_started' ? 'default' : 'outline'}>
                    {status === 'not_started' && (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        {t('startTest')}
                      </>
                    )}
                    {status === 'in_progress' && (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        {t('continueTest')}
                      </>
                    )}
                    {status === 'completed' && (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {t('viewResults')}
                      </>
                    )}
                    {status === 'skipped' && (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        {t('runAgain')}
                      </>
                    )}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
