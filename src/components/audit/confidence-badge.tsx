'use client'

import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FlaskConical
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import type { ConfidenceLevel, ConfidenceSignal } from '@/types'
import { cn } from '@/utils'
import { useTranslations } from 'next-intl'

interface ConfidenceBadgeProps {
  level: ConfidenceLevel
  score: number
  signals?: ConfidenceSignal[]
  isExperimental?: boolean
  showScore?: boolean
  className?: string
}

const levelConfig = {
  certain: {
    labelKey: 'certain',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  likely: {
    labelKey: 'likely',
    icon: AlertCircle,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  },
  needs_review: {
    labelKey: 'needsReview',
    icon: HelpCircle,
    className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  },
}

export function ConfidenceBadge({
  level,
  score,
  signals = [],
  isExperimental = false,
  showScore = false,
  className,
}: ConfidenceBadgeProps) {
  const t = useTranslations('Confidence')
  const config = levelConfig[level]
  const Icon = config.icon
  const label = t(config.labelKey)

  const tooltipContent = (
    <div className="space-y-2 max-w-xs">
      <div className="font-medium">
        {label} {showScore && `(${Math.round(score * 100)}%)`}
      </div>

      {signals.length > 0 && (
        <div className="text-xs space-y-1">
          <div className="font-medium text-muted-foreground">{t('signalsDetected')}:</div>
          {signals.map((signal, i) => (
            <div key={i} className="flex items-start gap-1">
              <span className={signal.type === 'positive' ? 'text-green-500' : 'text-orange-500'}>
                {signal.type === 'positive' ? '\u2713' : '\u26A0'}
              </span>
              <span>{signal.description}</span>
            </div>
          ))}
        </div>
      )}

      {isExperimental && (
        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <FlaskConical className="h-3 w-3" />
          {t('experimentalTooltip')}
        </div>
      )}
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'cursor-help gap-1',
              config.className,
              className
            )}
          >
            <Icon className="h-3 w-3" />
            <span className="text-xs">{label}</span>
            {isExperimental && <FlaskConical className="h-3 w-3 ml-1" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-3">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
