'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, XCircle, RefreshCw } from 'lucide-react'

interface AuditStatus {
  id: string
  status: string
  processedPages: number
  totalPages: number
  pagesAudited: number
  brokenPagesCount: number
  crawlIterations: number
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

interface Props {
  auditId: string
  projectId: string
  initialStatus: string
}

const POLL_INTERVAL = 3000 // 3 segundos

export function AuditProgress({ auditId, projectId, initialStatus }: Props) {
  const t = useTranslations('AuditStatus')
  const router = useRouter()
  const [status, setStatus] = useState<AuditStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/audits/${auditId}/status`)
      if (!response.ok) {
        throw new Error('Erro ao buscar status')
      }
      const data = await response.json()
      setStatus(data)
      setError(null)

      // Se completou ou falhou, atualizar a página
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(data.status)) {
        router.refresh()
      }
    } catch {
      setError('Erro ao buscar status da auditoria')
    } finally {
      setIsLoading(false)
    }
  }, [auditId, router])

  // Polling
  useEffect(() => {
    fetchStatus()

    const interval = setInterval(() => {
      fetchStatus()
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchStatus])

  async function handleCancel() {
    if (!confirm(t('confirmCancel'))) return

    setIsCancelling(true)
    try {
      const response = await fetch(`/api/audits/${auditId}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao cancelar')
      }

      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao cancelar auditoria')
    } finally {
      setIsCancelling(false)
    }
  }

  const currentStatus = status?.status || initialStatus
  const isInProgress = ['PENDING', 'CRAWLING', 'AUDITING', 'AGGREGATING', 'GENERATING'].includes(currentStatus)

  if (!isInProgress) {
    return null
  }

  // Calcular progresso
  const progressPercent = status?.totalPages
    ? Math.round((status.pagesAudited / status.totalPages) * 100)
    : 0

  return (
    <Card>
      <CardContent className="py-8">
        <div className="flex flex-col items-center space-y-6">
          {/* Spinner */}
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary" />
            <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
          </div>

          {/* Status Message */}
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">
              {currentStatus === 'PENDING' && t('waitingStart')}
              {currentStatus === 'CRAWLING' && t('crawling')}
              {currentStatus === 'AUDITING' && t('auditing')}
              {currentStatus === 'AGGREGATING' && t('aggregating')}
              {currentStatus === 'GENERATING' && t('generating')}
            </p>

            {/* Progress Details */}
            {status && (
              <div className="text-sm text-muted-foreground space-y-1">
                {currentStatus === 'CRAWLING' && (
                  <p>{t('discoveringPages')}</p>
                )}
                {currentStatus === 'AUDITING' && (
                  <>
                    <p>
                      {t('pagesProcessed', {
                        processed: status.pagesAudited,
                        total: status.totalPages,
                      })}
                    </p>
                    {status.brokenPagesCount > 0 && (
                      <p className="text-yellow-600">
                        {t('brokenPagesFound', { count: status.brokenPagesCount })}
                      </p>
                    )}
                  </>
                )}
                {currentStatus === 'AGGREGATING' && (
                  <p>{t('aggregatingResults')}</p>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {currentStatus === 'AUDITING' && status?.totalPages > 0 && (
            <div className="w-full max-w-md space-y-2">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {progressPercent}%
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStatus()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {t('cancel')}
            </Button>
          </div>

          {/* Time elapsed */}
          {status?.startedAt && (
            <p className="text-xs text-muted-foreground">
              {t('startedAt')}: {new Date(status.startedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
