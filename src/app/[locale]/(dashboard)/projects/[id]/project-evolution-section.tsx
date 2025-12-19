'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ComparisonCard } from '@/components/audit/comparison'
import { EvolutionChart, type Period } from '@/components/audit/evolution'
import type { ComparisonResponse, EvolutionResponse } from '@/types'
import { generateComparisonInsights } from '@/lib/audit/insights'

interface ProjectEvolutionSectionProps {
  projectId: string
  lastAuditId: string | null
  locale: string
}

/**
 * Componente de erro inline estilizado
 */
function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
      <CardContent className="flex items-center gap-3 py-4">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
        <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
      </CardContent>
    </Card>
  )
}

/**
 * Secao do dashboard que mostra evolucao e comparacao de auditorias
 * Carrega dados via API de forma assincrona
 */
export function ProjectEvolutionSection({
  projectId,
  lastAuditId,
  locale,
}: ProjectEvolutionSectionProps) {
  const t = useTranslations('AuditEvolution')
  const tErrors = useTranslations('Errors')
  const router = useRouter()
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null)
  const [evolutionData, setEvolutionData] = useState<EvolutionResponse | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30d')
  const [loadingComparison, setLoadingComparison] = useState(true)
  const [loadingEvolution, setLoadingEvolution] = useState(true)
  const [comparisonError, setComparisonError] = useState<string | null>(null)
  const [evolutionError, setEvolutionError] = useState<string | null>(null)

  // Carregar dados de comparacao
  useEffect(() => {
    if (!lastAuditId) {
      setLoadingComparison(false)
      return
    }

    let cancelled = false
    setLoadingComparison(true)
    setComparisonError(null)

    fetch(`/api/audits/${lastAuditId}/comparison`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (!cancelled) {
          setComparisonData(data)
          setComparisonError(null)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('[ProjectEvolutionSection] Failed to load comparison:', error)
          setComparisonError(tErrors('loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingComparison(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [lastAuditId, tErrors])

  // Carregar dados de evolucao
  useEffect(() => {
    let cancelled = false
    setLoadingEvolution(true)
    setEvolutionError(null)

    const params = new URLSearchParams({ period: selectedPeriod })
    fetch(`/api/projects/${projectId}/evolution?${params}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (!cancelled) {
          setEvolutionData(data)
          setEvolutionError(null)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('[ProjectEvolutionSection] Failed to load evolution:', error)
          setEvolutionError(tErrors('loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingEvolution(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [projectId, selectedPeriod, tErrors])

  // Gerar insights para comparacao
  const comparisonInsights = comparisonData && comparisonData.previous
    ? generateComparisonInsights({
        delta: comparisonData.delta,
        violations: comparisonData.violations,
        currentSummary: comparisonData.current.summary,
      })
    : []

  // Navegar para pagina de comparacao detalhada
  const handleCompareClick = () => {
    if (lastAuditId) {
      router.push(`/projects/${projectId}/audits/${lastAuditId}/compare`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Comparacao com auditoria anterior */}
      {lastAuditId && (
        <div className={loadingComparison ? 'animate-pulse' : ''}>
          {comparisonError ? (
            <ErrorCard message={comparisonError} />
          ) : (
            <ComparisonCard
              comparison={comparisonData}
              insights={comparisonInsights}
              projectId={projectId}
              auditId={lastAuditId}
              locale={locale}
              onCompareClick={handleCompareClick}
            />
          )}
        </div>
      )}

      {/* Grafico de evolucao */}
      <div className={loadingEvolution ? 'animate-pulse' : ''}>
        {evolutionError ? (
          <ErrorCard message={evolutionError} />
        ) : (
          <EvolutionChart
            data={evolutionData}
            projectId={projectId}
            locale={locale}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        )}
      </div>
    </div>
  )
}
