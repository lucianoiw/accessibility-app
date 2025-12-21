'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  HelpCircle,
  ExternalLink,
  Users,
  Wrench,
  AlertTriangle,
  BookOpen,
} from 'lucide-react'
import type { AggregatedViolation } from '@/types'
import { getRuleKnowledge } from '@/lib/audit/rule-knowledge'
import { getRuleLabel } from '@/lib/audit/rule-labels'

interface HelpModalProps {
  violation: AggregatedViolation
}

export function HelpModal({ violation }: HelpModalProps) {
  const t = useTranslations('HelpModal')
  const tWcag = useTranslations('WcagPartial')
  const [open, setOpen] = useState(false)

  const knowledge = getRuleKnowledge(violation.rule_id)
  const ruleLabel = getRuleLabel(violation.rule_id)

  // Helper para traduzir mensagens que podem ser chaves de tradução
  // Nota: algumas traduções WcagPartial têm placeholders que não temos aqui
  const translateMessage = (message: string): string => {
    if (!message) return ''
    if (message.startsWith('WcagPartial.')) {
      const key = message.replace('WcagPartial.', '')
      try {
        // Usa .raw() para pegar a string sem tentar formatar placeholders
        const rawMessage = tWcag.raw(key)
        if (typeof rawMessage === 'string') {
          // Remove placeholders não preenchidos para exibição limpa
          return rawMessage.replace(/\{[^}]+\}/g, '...').replace(/\.\.\.\.\.\./g, '...')
        }
        return message
      } catch {
        return message
      }
    }
    return message
  }

  const affectedUserTypes = knowledge?.affectedUsers || ['screenReader']

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          {t('help')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {ruleLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Why it matters */}
          <section>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              {t('whyItMatters')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {knowledge?.whyItMatters || translateMessage(violation.help) || t('defaultWhyItMatters')}
            </p>
          </section>

          {/* Affected users */}
          <section>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              {t('affectedUsers')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {affectedUserTypes.map((userType) => (
                <Badge key={userType} variant="secondary">
                  {t(`userType_${userType}`)}
                </Badge>
              ))}
            </div>
          </section>

          {/* How to fix */}
          <section>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
              <Wrench className="h-4 w-4 text-green-500" />
              {t('howToFix')}
            </h3>
            {knowledge?.fixSteps && knowledge.fixSteps.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {knowledge.fixSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {translateMessage(violation.help) || t('defaultHowToFix')}
              </p>
            )}
          </section>

          {/* Code examples */}
          {knowledge?.codeExamples && knowledge.codeExamples.length > 0 && (
            <section>
              <h3 className="font-semibold text-sm mb-2">{t('codeExample')}</h3>
              <div className="space-y-4">
                {knowledge.codeExamples.map((example, idx) => (
                  <div key={idx} className="space-y-2">
                    {example.description && (
                      <p className="text-xs text-muted-foreground">{example.description}</p>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs text-red-600 dark:text-red-400 mb-1">{t('before')}</p>
                        <pre className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2 text-xs overflow-x-auto">
                          <code>{example.before}</code>
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs text-green-600 dark:text-green-400 mb-1">{t('after')}</p>
                        <pre className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2 text-xs overflow-x-auto">
                          <code>{example.after}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* False positive guidance */}
          {knowledge?.falsePositiveGuidance && (
            <section>
              <h3 className="font-semibold text-sm mb-2">{t('falsePositiveGuidance')}</h3>
              <p className="text-sm text-muted-foreground">
                {knowledge.falsePositiveGuidance}
              </p>
            </section>
          )}

          {/* References */}
          <section>
            <h3 className="font-semibold text-sm mb-2">{t('references')}</h3>
            <div className="flex flex-wrap gap-2">
              {violation.wcag_criteria && violation.wcag_criteria.length > 0 && (
                <a
                  href={`https://www.w3.org/WAI/WCAG21/Understanding/${violation.wcag_criteria[0].toLowerCase().replace(/\./g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  WCAG {violation.wcag_criteria[0]} <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {violation.help_url && (
                <a
                  href={violation.help_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  {t('learnMore')} <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {violation.emag_recommendations && violation.emag_recommendations.length > 0 && (
                <a
                  href="https://emag.governoeletronico.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  eMAG {violation.emag_recommendations[0]} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
