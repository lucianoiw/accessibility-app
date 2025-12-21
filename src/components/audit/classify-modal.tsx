'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ClipboardCheck,
  HelpCircle,
  XCircle,
  MinusCircle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Lightbulb,
} from 'lucide-react'
import type { AggregatedViolation, ViolationOverride, ViolationOverrideType } from '@/types'
import { getRuleKnowledge } from '@/lib/audit/rule-knowledge'
import { getRuleLabel } from '@/lib/audit/rule-labels'

interface ClassifyModalProps {
  violation: AggregatedViolation
  projectId: string
  existingOverride?: ViolationOverride | null
  onSaved?: () => void
}

type View = 'choose' | 'guided' | 'decide'
type Answer = 'yes' | 'no' | 'unsure' | null

export function ClassifyModal({
  violation,
  projectId,
  existingOverride,
  onSaved,
}: ClassifyModalProps) {
  const t = useTranslations('ClassifyModal')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>(existingOverride ? 'decide' : 'choose')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // IGT state
  const [answers, setAnswers] = useState<Record<number, Answer>>({})

  // Decision state
  const [selectedDecision, setSelectedDecision] = useState<ViolationOverrideType | null>(
    existingOverride?.override_type || null
  )
  const [notes, setNotes] = useState(existingOverride?.notes || '')

  const knowledge = getRuleKnowledge(violation.rule_id)
  const ruleLabel = getRuleLabel(violation.rule_id)
  const elementXpath = violation.unique_elements?.[0]?.xpath || null

  // Guided questions
  const questions = useMemo(() => {
    if (knowledge?.evaluationQuestions && knowledge.evaluationQuestions.length > 0) {
      return knowledge.evaluationQuestions
    }
    return [
      t('genericQuestion1'),
      t('genericQuestion2'),
      t('genericQuestion3'),
    ]
  }, [knowledge, t])

  // Calculate suggested decision based on answers
  const suggestedDecision = useMemo(() => {
    const answerValues = Object.values(answers)
    if (answerValues.length === 0) return null

    const yesCount = answerValues.filter(a => a === 'yes').length
    const noCount = answerValues.filter(a => a === 'no').length

    if (noCount > yesCount) return 'false_positive'
    if (yesCount > noCount) return 'confirmed'
    return null
  }, [answers])

  const handleAnswer = (questionIndex: number, answer: Answer) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }))
  }

  const handleSave = async () => {
    if (!selectedDecision) return

    setLoading(true)
    setError(null)

    try {
      const method = existingOverride?.id ? 'PUT' : 'POST'
      const body = {
        ...(existingOverride?.id && { id: existingOverride.id }),
        project_id: projectId,
        rule_id: violation.rule_id,
        element_xpath: elementXpath,
        override_type: selectedDecision,
        notes: notes.trim() || null,
      }

      const response = await fetch('/api/violation-overrides', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('errorSaving'))
      }

      setOpen(false)
      router.refresh()
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorSaving'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!existingOverride?.id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/violation-overrides?id=${existingOverride.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(t('errorDeleting'))
      }

      setOpen(false)
      router.refresh()
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorDeleting'))
    } finally {
      setLoading(false)
    }
  }

  const resetState = () => {
    setView(existingOverride ? 'decide' : 'choose')
    setAnswers({})
    setSelectedDecision(existingOverride?.override_type || null)
    setNotes(existingOverride?.notes || '')
    setError(null)
  }

  const decisionOptions: { type: ViolationOverrideType; icon: React.ReactNode; color: string }[] = [
    {
      type: 'false_positive',
      icon: <XCircle className="h-5 w-5" />,
      color: 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50',
    },
    {
      type: 'ignored',
      icon: <MinusCircle className="h-5 w-5" />,
      color: 'border-slate-500 bg-slate-50 dark:bg-slate-950/30 hover:bg-slate-100 dark:hover:bg-slate-900/50',
    },
    {
      type: 'fixed',
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'border-green-500 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/50',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant={existingOverride ? 'outline' : 'default'} size="sm" className="gap-2">
          <ClipboardCheck className="h-4 w-4" />
          {existingOverride ? t('review') : t('classify')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {ruleLabel}
          </DialogDescription>
        </DialogHeader>

        {/* View: Choose (need help or not) */}
        {view === 'choose' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('needHelp')}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-auto py-4 flex-col gap-2"
                onClick={() => setView('guided')}
              >
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <span>{t('yesGuideMe')}</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-auto py-4 flex-col gap-2"
                onClick={() => setView('decide')}
              >
                <ChevronRight className="h-5 w-5" />
                <span>{t('noIKnow')}</span>
              </Button>
            </div>
          </div>
        )}

        {/* View: Guided Questions */}
        {view === 'guided' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('answerQuestions')}</p>

            <div className="space-y-3">
              {questions.map((question, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">{question}</p>
                  <div className="flex gap-2">
                    {(['yes', 'no', 'unsure'] as const).map((answer) => (
                      <Button
                        key={answer}
                        variant={answers[idx] === answer ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleAnswer(idx, answer)}
                        className={answers[idx] === answer ? (
                          answer === 'yes' ? 'bg-green-600 hover:bg-green-700' :
                          answer === 'no' ? 'bg-red-600 hover:bg-red-700' :
                          'bg-yellow-600 hover:bg-yellow-700'
                        ) : ''}
                      >
                        {t(`answer_${answer}`)}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Suggestion based on answers */}
            {suggestedDecision && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">
                  {suggestedDecision === 'false_positive'
                    ? t('suggestionFalsePositive')
                    : t('suggestionConfirmed')
                  }
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setView('choose')}>
                {t('back')}
              </Button>
              <Button onClick={() => {
                if (suggestedDecision === 'false_positive') {
                  setSelectedDecision('false_positive')
                }
                setView('decide')
              }}>
                {t('continue')}
              </Button>
            </div>
          </div>
        )}

        {/* View: Decide */}
        {view === 'decide' && (
          <div className="space-y-4">
            {!existingOverride && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setView('choose')}
              >
                {t('needHelpDeciding')}
              </Button>
            )}

            <div className="space-y-2">
              <Label>{t('selectClassification')}</Label>
              <div className="grid gap-2">
                {decisionOptions.map(({ type, icon, color }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedDecision(type)}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all text-left ${
                      selectedDecision === type
                        ? `${color} border-current`
                        : 'border-transparent hover:bg-muted'
                    }`}
                  >
                    {icon}
                    <div>
                      <p className="font-medium">{t(`decision_${type}`)}</p>
                      <p className="text-xs text-muted-foreground">{t(`decision_${type}_desc`)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('notes')}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2 justify-between">
              {existingOverride && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {t('remove')}
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!selectedDecision || loading}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('save')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
