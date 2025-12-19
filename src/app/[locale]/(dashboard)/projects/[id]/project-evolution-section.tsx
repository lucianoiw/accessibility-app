'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ComparisonCard } from '@/components/audit/comparison'
import { EvolutionChart, type Period } from '@/components/audit/evolution'
import type { ComparisonResponse, EvolutionResponse, Insight } from '@/types'
import { generateComparisonInsights } from '@/lib/audit/insights'

interface ProjectEvolutionSectionProps {
  projectId: string
  lastAuditId: string | null
  locale: string
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
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null)
  const [evolutionData, setEvolutionData] = useState<EvolutionResponse | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30d')
  const [loadingComparison, setLoadingComparison] = useState(true)
  const [loadingEvolution, setLoadingEvolution] = useState(true)

  // Carregar dados de comparacao
  useEffect(() => {
    if (!lastAuditId) {
      setLoadingComparison(false)
      return
    }

    setLoadingComparison(true)
    fetch(`/api/audits/${lastAuditId}/comparison`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setComparisonData(data)
        setLoadingComparison(false)
      })
      .catch(() => {
        setLoadingComparison(false)
      })
  }, [lastAuditId])

  // Carregar dados de evolucao
  useEffect(() => {
    setLoadingEvolution(true)
    const params = new URLSearchParams({ period: selectedPeriod })
    fetch(`/api/projects/${projectId}/evolution?${params}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setEvolutionData(data)
        setLoadingEvolution(false)
      })
      .catch(() => {
        setLoadingEvolution(false)
      })
  }, [projectId, selectedPeriod])

  // Gerar insights para comparacao
  const comparisonInsights = comparisonData && comparisonData.previous
    ? generateComparisonInsights({
        delta: comparisonData.delta,
        violations: comparisonData.violations,
        currentSummary: comparisonData.current.summary,
      })
    : []

  return (
    <div className="space-y-6">
      {/* Comparacao com auditoria anterior */}
      {lastAuditId && (
        <div className={loadingComparison ? 'animate-pulse' : ''}>
          <ComparisonCard
            comparison={comparisonData}
            insights={comparisonInsights}
            projectId={projectId}
            auditId={lastAuditId}
            locale={locale}
          />
        </div>
      )}

      {/* Grafico de evolucao */}
      <div className={loadingEvolution ? 'animate-pulse' : ''}>
        <EvolutionChart
          data={evolutionData}
          projectId={projectId}
          locale={locale}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </div>
    </div>
  )
}
