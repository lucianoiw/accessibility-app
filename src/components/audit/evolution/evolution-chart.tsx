'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/utils'
import { PeriodSelector, type Period } from './period-selector'
import { TrendIndicator } from '../comparison/trend-indicator'
import type { EvolutionResponse, EvolutionAudit, TrendDirection } from '@/types'

// Cores para as linhas do grafico
const LINE_COLORS = {
  healthScore: '#22C55E', // green-500
  critical: '#DC2626', // red-600
  serious: '#EA580C', // orange-600
  moderate: '#EAB308', // yellow-500
  minor: '#6B7280', // gray-500
  total: '#3B82F6', // blue-500
  patterns: '#8B5CF6', // violet-500
}

interface EvolutionChartProps {
  data: EvolutionResponse | null
  projectId: string
  locale: string
  className?: string
  onPeriodChange?: (period: Period) => void
  selectedPeriod?: Period
}

type ChartMode = 'healthScore' | 'violations'

/**
 * Grafico de evolucao da acessibilidade ao longo do tempo
 */
export function EvolutionChart({
  data,
  projectId,
  locale,
  className,
  onPeriodChange,
  selectedPeriod = '30d',
}: EvolutionChartProps) {
  const t = useTranslations('AuditEvolution')
  const tSeverity = useTranslations('Severity')
  const [chartMode, setChartMode] = useState<ChartMode>('healthScore')
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    critical: true,
    serious: true,
    moderate: true,
    minor: false, // Minor desativado por padrao para nao poluir
    total: false,
    patterns: true, // Padrões visíveis por padrão
  })

  // Transformar dados de auditoria para formato do grafico
  const chartData = useMemo(() => {
    if (!data?.audits || data.audits.length === 0) return []

    // Ordenar por data (mais antigo primeiro)
    // NOTA: Filtramos auditorias sem healthScore para evitar exibir 0% incorretamente
    const sorted = [...data.audits]
      .filter((audit) => audit.healthScore !== null && audit.healthScore !== undefined)
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

    return sorted.map((audit) => {
      const date = new Date(audit.createdAt)
      return {
        id: audit.id,
        date: date.toLocaleDateString(locale, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        fullDate: date.toLocaleDateString(locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        healthScore: audit.healthScore ?? 0, // Já filtrado, então nunca será null
        critical: audit.summary?.critical ?? 0,
        serious: audit.summary?.serious ?? 0,
        moderate: audit.summary?.moderate ?? 0,
        minor: audit.summary?.minor ?? 0,
        total: audit.summary?.total ?? 0,
        patterns: audit.summary?.patterns?.total ?? 0,
      }
    })
  }, [data?.audits, locale])

  // Obter tendencia do health score
  const healthScoreTrend = data?.trends?.healthScore

  // Toggle de linha individual
  const toggleLine = (key: string) => {
    setVisibleLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Mostrar todas ou esconder todas as linhas
  const toggleAllLines = () => {
    const allVisible = Object.values(visibleLines).every((v) => v)
    const newValue = !allVisible
    setVisibleLines({
      critical: newValue,
      serious: newValue,
      moderate: newValue,
      minor: newValue,
      total: newValue,
      patterns: newValue,
    })
  }

  // Se nao ha dados
  if (!data || chartData.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{t('title')}</CardTitle>
          </div>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <TrendingUp className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">{t('trend.noData')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{t('title')}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('subtitle')}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-sm">{t('subtitle')}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle entre Health Score e Violations */}
            <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => setChartMode('healthScore')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  chartMode === 'healthScore'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('chart.healthScore')}
              </button>
              <button
                type="button"
                onClick={() => setChartMode('violations')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  chartMode === 'violations'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('chart.violations')}
              </button>
            </div>

            {onPeriodChange && (
              <PeriodSelector
                value={selectedPeriod}
                onChange={onPeriodChange}
                className="w-36"
              />
            )}
          </div>
        </div>

        {/* Tendencia geral */}
        {healthScoreTrend && chartMode === 'healthScore' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendIndicator
              direction={healthScoreTrend.direction}
              type="score"
              size="sm"
            />
            <span>
              {healthScoreTrend.direction === 'up'
                ? t('trend.improving')
                : healthScoreTrend.direction === 'down'
                ? t('trend.worsening')
                : t('trend.stable')}
              {healthScoreTrend.changePercent !== 0 && (
                <span className="ml-1">
                  ({healthScoreTrend.changePercent > 0 ? '+' : ''}
                  {Math.round(healthScoreTrend.changePercent)}%)
                </span>
              )}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Legenda clicavel para modo violations */}
        {chartMode === 'violations' && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground mr-2">
              {t('chart.violations')}:
            </span>
            {[
              { key: 'critical', label: tSeverity('critical'), color: LINE_COLORS.critical },
              { key: 'serious', label: tSeverity('serious'), color: LINE_COLORS.serious },
              { key: 'moderate', label: tSeverity('moderate'), color: LINE_COLORS.moderate },
              { key: 'minor', label: tSeverity('minor'), color: LINE_COLORS.minor },
              { key: 'total', label: 'Total', color: LINE_COLORS.total },
              { key: 'patterns', label: t('chart.patterns'), color: LINE_COLORS.patterns },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleLine(item.key)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors',
                  visibleLines[item.key]
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground opacity-50 hover:opacity-100'
                )}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={toggleAllLines}
              className="text-xs text-blue-500 hover:underline ml-2"
            >
              {Object.values(visibleLines).every((v) => v)
                ? t('chart.hideAll')
                : t('chart.showAll')}
            </button>
          </div>
        )}

        {/* Grafico */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={chartMode === 'healthScore' ? [0, 100] : ['auto', 'auto']}
                width={35}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null

                  const dataPoint = payload[0]?.payload
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium mb-2">{dataPoint?.fullDate}</p>
                      {payload.map((entry: any) => (
                        <div
                          key={entry.dataKey}
                          className="flex items-center justify-between gap-4"
                        >
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            {entry.name}
                          </span>
                          <span className="font-medium">
                            {entry.value}
                            {entry.dataKey === 'healthScore' && '%'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />

              {chartMode === 'healthScore' ? (
                <Line
                  type="monotone"
                  dataKey="healthScore"
                  name={t('chart.healthScore')}
                  stroke={LINE_COLORS.healthScore}
                  strokeWidth={2}
                  dot={{ r: 4, fill: LINE_COLORS.healthScore }}
                  activeDot={{ r: 6 }}
                />
              ) : (
                <>
                  {visibleLines.critical && (
                    <Line
                      type="monotone"
                      dataKey="critical"
                      name={tSeverity('critical')}
                      stroke={LINE_COLORS.critical}
                      strokeWidth={2}
                      dot={{ r: 3, fill: LINE_COLORS.critical }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                  {visibleLines.serious && (
                    <Line
                      type="monotone"
                      dataKey="serious"
                      name={tSeverity('serious')}
                      stroke={LINE_COLORS.serious}
                      strokeWidth={2}
                      dot={{ r: 3, fill: LINE_COLORS.serious }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                  {visibleLines.moderate && (
                    <Line
                      type="monotone"
                      dataKey="moderate"
                      name={tSeverity('moderate')}
                      stroke={LINE_COLORS.moderate}
                      strokeWidth={2}
                      dot={{ r: 3, fill: LINE_COLORS.moderate }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                  {visibleLines.minor && (
                    <Line
                      type="monotone"
                      dataKey="minor"
                      name={tSeverity('minor')}
                      stroke={LINE_COLORS.minor}
                      strokeWidth={2}
                      dot={{ r: 3, fill: LINE_COLORS.minor }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                  {visibleLines.total && (
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke={LINE_COLORS.total}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: LINE_COLORS.total }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                  {visibleLines.patterns && (
                    <Line
                      type="monotone"
                      dataKey="patterns"
                      name={t('chart.patterns')}
                      stroke={LINE_COLORS.patterns}
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={{ r: 3, fill: LINE_COLORS.patterns }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Resumo estatistico */}
        {chartMode === 'healthScore' && chartData.length >= 2 && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <StatCard
              label={t('chart.healthScore')}
              value={`${chartData[chartData.length - 1]?.healthScore ?? 0}%`}
              subLabel="Atual"
            />
            <StatCard
              label="Inicio"
              value={`${chartData[0]?.healthScore ?? 0}%`}
              subLabel={chartData[0]?.date}
            />
            <StatCard
              label="Variacao"
              value={`${(healthScoreTrend?.changePercent ?? 0) > 0 ? '+' : ''}${Math.round(healthScoreTrend?.changePercent ?? 0)}%`}
              subLabel={`${chartData.length} auditorias`}
              positive={(healthScoreTrend?.changePercent ?? 0) > 0}
              negative={(healthScoreTrend?.changePercent ?? 0) < 0}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// Componente auxiliar: StatCard
// ============================================

interface StatCardProps {
  label: string
  value: string
  subLabel?: string
  positive?: boolean
  negative?: boolean
}

function StatCard({ label, value, subLabel, positive, negative }: StatCardProps) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p
        className={cn(
          'text-2xl font-bold',
          positive && 'text-green-600 dark:text-green-400',
          negative && 'text-red-600 dark:text-red-400'
        )}
      >
        {value}
      </p>
      {subLabel && (
        <p className="text-xs text-muted-foreground">{subLabel}</p>
      )}
    </div>
  )
}
