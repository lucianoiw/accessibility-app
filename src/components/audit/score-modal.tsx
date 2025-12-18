'use client'

import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ScoreData } from '@/lib/audit/score-calculator'
import { PASS_WEIGHTS, FAIL_WEIGHTS } from '@/lib/audit/score-calculator'

interface ScoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scoreData: ScoreData
}

export function ScoreModal({ open, onOpenChange, scoreData }: ScoreModalProps) {
  const t = useTranslations('ScoreModal')
  const { score, passedRules, failedRules, weightedPassed, weightedFailed } = scoreData

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          {/* Formula principal */}
          <p className="text-muted-foreground">
            {t('description')}
          </p>

          <div className="bg-muted/50 rounded-lg p-4 font-mono text-center">
            <div className="text-green-600 dark:text-green-400">
              {t('accessibilityScore')} =
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="text-center">
                <div className="border-b border-foreground px-4 pb-1">
                  {t('weightedSumPassed')}
                </div>
                <div className="pt-1">
                  {t('weightedSumAll')}
                </div>
              </div>
              <span>× 100</span>
            </div>
          </div>

          {/* Calculating weighted sum */}
          <div>
            <h3 className="font-semibold mb-3">
              {t('calculatingWeightedSum')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('sumDescription')}
            </p>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b">
                  <th className="text-left py-2 font-medium">{t('ruleSeverity')}</th>
                  <th className="text-center py-2 font-medium">{t('passedRules')}</th>
                  <th className="text-center py-2 font-medium">{t('failedRules')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2">{t('critical')}</td>
                  <td className="py-2 text-center">{passedRules.critical}</td>
                  <td className="py-2 text-center">{failedRules.critical}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">{t('serious')}</td>
                  <td className="py-2 text-center">{passedRules.serious}</td>
                  <td className="py-2 text-center">{failedRules.serious}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">{t('moderate')}</td>
                  <td className="py-2 text-center">{passedRules.moderate}</td>
                  <td className="py-2 text-center">{failedRules.moderate}</td>
                </tr>
                <tr>
                  <td className="py-2">{t('minor')}</td>
                  <td className="py-2 text-center">{passedRules.minor}</td>
                  <td className="py-2 text-center">{failedRules.minor}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pass weights */}
          <div>
            <p className="text-muted-foreground mb-2">
              {t('passWeightsDesc', { critical: PASS_WEIGHTS.critical, serious: PASS_WEIGHTS.serious, moderate: PASS_WEIGHTS.moderate, minor: PASS_WEIGHTS.minor })}
            </p>
            <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm">
              <span className="text-green-600 dark:text-green-400">
                {t('weightedSumPassed')}
              </span>
              {' = '}
              ({passedRules.critical}×{PASS_WEIGHTS.critical}) + ({passedRules.serious}×{PASS_WEIGHTS.serious}) + ({passedRules.moderate}×{PASS_WEIGHTS.moderate}) + ({passedRules.minor}×{PASS_WEIGHTS.minor}) = {' '}
              <span className="font-bold">{weightedPassed}</span>
            </div>
          </div>

          {/* Fail weights */}
          <div>
            <p className="text-muted-foreground mb-2">
              {t('failWeightsReason')}
              <br />
              {t('failWeightsDesc', { critical: FAIL_WEIGHTS.critical, serious: FAIL_WEIGHTS.serious, moderate: FAIL_WEIGHTS.moderate, minor: FAIL_WEIGHTS.minor })}
            </p>
            <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm">
              <span className="text-purple-600 dark:text-purple-400">
                {t('weightedSumFailed')}
              </span>
              {' = '}
              ({failedRules.critical}×{FAIL_WEIGHTS.critical}) + ({failedRules.serious}×{FAIL_WEIGHTS.serious}) + ({failedRules.moderate}×{FAIL_WEIGHTS.moderate}) + ({failedRules.minor}×{FAIL_WEIGHTS.minor}) = {' '}
              <span className="font-bold">{weightedFailed}</span>
            </div>
          </div>

          {/* Final calculation */}
          <div>
            <h3 className="font-semibold mb-3">
              {t('calculatingFinalScore')}
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-green-600 dark:text-green-400">
                  {t('accessibilityScore')}
                </span>
                <span>=</span>
                <div className="text-center">
                  <div className="border-b border-foreground px-2 pb-1">
                    {weightedPassed}
                  </div>
                  <div className="pt-1">
                    {weightedPassed} + {weightedFailed}
                  </div>
                </div>
                <span>× 100 =</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {score}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
