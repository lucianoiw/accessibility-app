'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Play,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  HelpCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { IGTSession, IGTAuditContext, IGTQuestion, IGTCandidate, IGTAnswer } from '@/lib/igt/types'

interface IGTRunnerProps {
  igtId: string
  auditId: string
  projectId: string
  userId: string
  baseUrl: string
  existingSession: IGTSession | null
  violations: IGTAuditContext['violations']
  pages: IGTAuditContext['pages']
  includeEmag: boolean
  includeCoga: boolean
}

// Simplified IGT definitions (should match registry)
const IGT_CONFIGS: Record<string, {
  relevantRuleIds: string[]
  questions: IGTQuestion[]
}> = {
  'images-alt-quality': {
    relevantRuleIds: ['image-alt', 'imagem-alt-nome-arquivo', 'image-redundant-alt'],
    questions: [
      {
        id: 'describes-content',
        order: 1,
        type: 'yes_no_unsure',
        textKey: 'IGT.images.questions.describesContent',
        helpTextKey: 'IGT.images.questions.describesContentHelp',
        resultMapping: { yes: 'pass', no: 'fail', unsure: 'warning' },
      },
      {
        id: 'is-decorative',
        order: 2,
        type: 'yes_no',
        textKey: 'IGT.images.questions.isDecorative',
        helpTextKey: 'IGT.images.questions.isDecorativeHelp',
        showIf: (answers) => answers.find(a => a.questionId === 'describes-content')?.value === 'no',
        resultMapping: { yes: 'pass', no: 'fail' },
      },
    ],
  },
  'links-purpose': {
    relevantRuleIds: ['link-texto-generico', 'link-name', 'rotulo-curto-ambiguo'],
    questions: [
      {
        id: 'context-clear',
        order: 1,
        type: 'yes_no_unsure',
        textKey: 'IGT.links.questions.contextClear',
        helpTextKey: 'IGT.links.questions.contextClearHelp',
        resultMapping: { yes: 'pass', no: 'fail', unsure: 'warning' },
      },
      {
        id: 'destination-predictable',
        order: 2,
        type: 'yes_no',
        textKey: 'IGT.links.questions.destinationPredictable',
        helpTextKey: 'IGT.links.questions.destinationPredictableHelp',
        resultMapping: { yes: 'pass', no: 'fail' },
      },
    ],
  },
  'sign-language-plugin': {
    relevantRuleIds: ['brasil-libras-plugin'],
    questions: [
      {
        id: 'widget-visible',
        order: 1,
        type: 'yes_no',
        textKey: 'IGT.signLanguage.questions.widgetVisible',
        helpTextKey: 'IGT.signLanguage.questions.widgetVisibleHelp',
        resultMapping: { yes: 'pass', no: 'fail' },
      },
      {
        id: 'widget-activates',
        order: 2,
        type: 'yes_no',
        textKey: 'IGT.signLanguage.questions.widgetActivates',
        helpTextKey: 'IGT.signLanguage.questions.widgetActivatesHelp',
        showIf: (answers) => answers.find(a => a.questionId === 'widget-visible')?.value === 'yes',
        resultMapping: { yes: 'pass', no: 'fail' },
      },
      {
        id: 'avatar-appears',
        order: 3,
        type: 'yes_no',
        textKey: 'IGT.signLanguage.questions.avatarAppears',
        helpTextKey: 'IGT.signLanguage.questions.avatarAppearsHelp',
        showIf: (answers) => answers.find(a => a.questionId === 'widget-activates')?.value === 'yes',
        resultMapping: { yes: 'pass', no: 'fail' },
      },
    ],
  },
}

export function IGTRunner({
  igtId,
  auditId,
  projectId,
  userId,
  baseUrl,
  existingSession,
  violations,
  pages,
  includeEmag,
  includeCoga,
}: IGTRunnerProps) {
  const t = useTranslations('IGT')
  const router = useRouter()
  const supabase = createClient()

  const config = IGT_CONFIGS[igtId]

  // State
  const [session, setSession] = useState<IGTSession | null>(existingSession as IGTSession | null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState<string>('')
  const [comment, setComment] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  // Generate candidates from violations
  const generateCandidates = useCallback((): IGTCandidate[] => {
    if (!config) return []

    const candidates: IGTCandidate[] = []

    for (const violation of violations) {
      if (config.relevantRuleIds.includes(violation.ruleId)) {
        candidates.push({
          id: `violation-${violation.id}`,
          elementType: violation.ruleId.includes('image') ? 'img' : 'a',
          selector: violation.selector,
          html: violation.html,
          pageUrl: violation.pageUrl,
          violationId: violation.id,
        })
      }
    }

    return candidates
  }, [violations, config])

  // Start new session
  const startSession = async () => {
    setIsLoading(true)

    const candidates = generateCandidates()

    if (candidates.length === 0) {
      alert(t('noCandidates'))
      setIsLoading(false)
      return
    }

    const newSession: IGTSession = {
      id: crypto.randomUUID(),
      auditId,
      igtId,
      status: 'in_progress',
      currentCandidateIndex: 0,
      totalCandidates: candidates.length,
      candidates,
      answers: [],
      results: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      userId,
    }

    // Save to database
    // Note: Using 'as any' because igt_sessions table types aren't generated yet
    // After running migration 00019, regenerate types with: supabase gen types
    const { error } = await (supabase.from('igt_sessions') as any)
      .upsert({
        id: newSession.id,
        audit_id: newSession.auditId,
        igt_id: newSession.igtId,
        status: newSession.status,
        current_candidate_index: newSession.currentCandidateIndex,
        total_candidates: newSession.totalCandidates,
        candidates: newSession.candidates,
        answers: newSession.answers,
        results: newSession.results,
        started_at: newSession.startedAt,
        completed_at: newSession.completedAt,
        user_id: newSession.userId,
      }, { onConflict: 'audit_id,igt_id' })

    if (error) {
      console.error('Failed to create session:', error)
      alert(t('errorCreatingSession'))
      setIsLoading(false)
      return
    }

    setSession(newSession)
    setIsLoading(false)
  }

  // Get current state
  const currentCandidate = session?.candidates[session.currentCandidateIndex] || null
  const candidateAnswers = session?.answers.filter(a => a.candidateId === currentCandidate?.id) || []
  const answeredQuestionIds = new Set(candidateAnswers.map(a => a.questionId))

  // Find current question
  const currentQuestion = config?.questions.find(q => {
    if (answeredQuestionIds.has(q.id)) return false
    if (q.showIf && !q.showIf(candidateAnswers)) return false
    return true
  }) || null

  const progress = session
    ? Math.round((session.currentCandidateIndex / Math.max(session.totalCandidates, 1)) * 100)
    : 0

  // Submit answer
  const submitAnswer = async () => {
    if (!session || !currentCandidate || !currentQuestion || !currentAnswer) return

    setIsLoading(true)

    const answer: IGTAnswer = {
      questionId: currentQuestion.id,
      candidateId: currentCandidate.id,
      value: currentAnswer,
      timestamp: new Date().toISOString(),
      comment: comment || undefined,
    }

    const updatedSession = {
      ...session,
      answers: [...session.answers, answer],
    }

    // Check if candidate is complete (no more questions)
    const newCandidateAnswers = [...candidateAnswers, answer]
    const hasMoreQuestions = config?.questions.some(q => {
      if (newCandidateAnswers.some(a => a.questionId === q.id)) return false
      if (q.showIf && !q.showIf(newCandidateAnswers)) return false
      return true
    })

    if (!hasMoreQuestions) {
      // Move to next candidate
      updatedSession.currentCandidateIndex++

      // Check if all done
      if (updatedSession.currentCandidateIndex >= updatedSession.totalCandidates) {
        updatedSession.status = 'completed'
        updatedSession.completedAt = new Date().toISOString()
        // Process results would happen here
      }
    }

    // Save to database
    const { error } = await (supabase.from('igt_sessions') as any)
      .update({
        current_candidate_index: updatedSession.currentCandidateIndex,
        answers: updatedSession.answers,
        status: updatedSession.status,
        completed_at: updatedSession.completedAt,
      })
      .eq('id', session.id)

    if (error) {
      console.error('Failed to save answer:', error)
      alert(t('errorSavingAnswer'))
      setIsLoading(false)
      return
    }

    setSession(updatedSession)
    setCurrentAnswer('')
    setComment('')
    setIsLoading(false)

    // If completed, redirect to results
    if (updatedSession.status === 'completed') {
      router.push(`/projects/${projectId}/audits/${auditId}/igt`)
    }
  }

  // Skip candidate
  const skipCandidate = async () => {
    if (!session) return

    setIsLoading(true)

    const updatedSession = {
      ...session,
      currentCandidateIndex: session.currentCandidateIndex + 1,
    }

    if (updatedSession.currentCandidateIndex >= updatedSession.totalCandidates) {
      updatedSession.status = 'completed'
      updatedSession.completedAt = new Date().toISOString()
    }

    const { error } = await (supabase.from('igt_sessions') as any)
      .update({
        current_candidate_index: updatedSession.currentCandidateIndex,
        status: updatedSession.status,
        completed_at: updatedSession.completedAt,
      })
      .eq('id', session.id)

    if (error) {
      console.error('Failed to skip:', error)
      setIsLoading(false)
      return
    }

    setSession(updatedSession)
    setCurrentAnswer('')
    setComment('')
    setIsLoading(false)

    if (updatedSession.status === 'completed') {
      router.push(`/projects/${projectId}/audits/${auditId}/igt`)
    }
  }

  // Not started state
  if (!session) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle>{t(`${igtId}.name`)}</CardTitle>
          <CardDescription>{t(`${igtId}.description`)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-medium">{t('beforeYouStart')}</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t('instructions.1')}</li>
              <li>{t('instructions.2')}</li>
              <li>{t('instructions.3')}</li>
            </ul>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            {t('estimatedTime', { minutes: 5 })}
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={startSession} disabled={isLoading} size="lg">
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {t('startTest')}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Completed state
  if (session.status === 'completed') {
    const results = session.results || []
    const failCount = results.filter((r: { result: string }) => r.result === 'fail').length
    const passCount = results.filter((r: { result: string }) => r.result === 'pass').length
    const warningCount = results.filter((r: { result: string }) => r.result === 'warning').length

    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <CardTitle>{t('testCompleted')}</CardTitle>
          <CardDescription>{t('testCompletedDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{passCount}</div>
              <div className="text-sm text-green-700">{t('passed')}</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-sm text-yellow-700">{t('warnings')}</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{failCount}</div>
              <div className="text-sm text-red-700">{t('issues')}</div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={() => router.push(`/projects/${projectId}/audits/${auditId}/igt`)}>
            {t('backToList')}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // In progress - show current question
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t(`${igtId}.name`)}</span>
            <span className="text-sm text-muted-foreground">
              {session.currentCandidateIndex + 1} / {session.totalCandidates}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Element preview */}
      {currentCandidate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('elementToEvaluate')}</CardTitle>
            <CardDescription>
              <a
                href={currentCandidate.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {currentCandidate.pageUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <code className="text-sm whitespace-pre-wrap break-all">
                {currentCandidate.html}
              </code>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('selector')}: <code>{currentCandidate.selector}</code>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Question */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">{t(currentQuestion.textKey)}</CardTitle>
              {currentQuestion.helpTextKey && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHelp(!showHelp)}
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              )}
            </div>
            {showHelp && currentQuestion.helpTextKey && (
              <CardDescription className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg mt-2">
                {t(currentQuestion.helpTextKey)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {currentQuestion.type === 'yes_no' && (
              <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label htmlFor="yes">{t('yes')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no">{t('no')}</Label>
                </div>
              </RadioGroup>
            )}

            {currentQuestion.type === 'yes_no_unsure' && (
              <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label htmlFor="yes">{t('yes')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no">{t('no')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unsure" id="unsure" />
                  <Label htmlFor="unsure">{t('unsure')}</Label>
                </div>
              </RadioGroup>
            )}

            <div className="space-y-2">
              <Label htmlFor="comment">{t('optionalComment')}</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('commentPlaceholder')}
                rows={2}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" onClick={skipCandidate} disabled={isLoading}>
              <SkipForward className="h-4 w-4 mr-2" />
              {t('skipElement')}
            </Button>
            <Button onClick={submitAnswer} disabled={!currentAnswer || isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {t('nextQuestion')}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
