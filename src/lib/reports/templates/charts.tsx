/**
 * Componentes de grafico SVG para relatorios PDF
 * Todos os graficos sao renderizados como SVG inline para compatibilidade com PDF
 */

import { COLORS } from './styles'

interface PieChartData {
  label: string
  value: number
  color: string
}

interface PieChartProps {
  data: PieChartData[]
  size?: number
  showLegend?: boolean
}

/**
 * Grafico de pizza para distribuicao de severidade
 */
export function PieChart({ data, size = 200, showLegend = true }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: COLORS.gray500 }}>
        Nenhum dado disponivel
      </div>
    )
  }

  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2 - 10

  let currentAngle = -90 // Comeca do topo

  const slices = data.map((d, i) => {
    const percentage = d.value / total
    const angle = percentage * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle

    // Calcular pontos do arco
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = centerX + radius * Math.cos(startRad)
    const y1 = centerY + radius * Math.sin(startRad)
    const x2 = centerX + radius * Math.cos(endRad)
    const y2 = centerY + radius * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0

    currentAngle = endAngle

    // Path do arco
    const path =
      percentage === 1
        ? // Circulo completo
          `M ${centerX} ${centerY - radius}
           A ${radius} ${radius} 0 1 1 ${centerX - 0.01} ${centerY - radius}
           Z`
        : `M ${centerX} ${centerY}
           L ${x1} ${y1}
           A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
           Z`

    return (
      <path key={i} d={path} fill={d.color} stroke={COLORS.white} strokeWidth="2" />
    )
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices}
      </svg>
      {showLegend && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  background: d.color,
                }}
              />
              <span style={{ fontSize: '12px', color: COLORS.gray700 }}>
                {d.label}: <strong>{d.value}</strong>{' '}
                <span style={{ color: COLORS.gray500 }}>
                  ({Math.round((d.value / total) * 100)}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercentage?: boolean
  color?: string
  height?: number
}

/**
 * Barra de progresso para compliance
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = COLORS.primary,
  height = 16,
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100)

  return (
    <div>
      {label && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px',
            fontSize: '12px',
          }}
        >
          <span style={{ color: COLORS.gray700 }}>{label}</span>
          {showPercentage && (
            <span style={{ fontWeight: 600, color: COLORS.gray900 }}>{percentage}%</span>
          )}
        </div>
      )}
      <div
        style={{
          background: COLORS.gray200,
          borderRadius: '9999px',
          height: `${height}px`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: color,
            height: '100%',
            width: `${percentage}%`,
            borderRadius: '9999px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}

interface HorizontalBarChartData {
  label: string
  value: number
  color?: string
}

interface HorizontalBarChartProps {
  data: HorizontalBarChartData[]
  maxValue?: number
  height?: number
  showValues?: boolean
}

/**
 * Grafico de barras horizontal para principios WCAG
 */
export function HorizontalBarChart({
  data,
  maxValue,
  height = 24,
  showValues = true,
}: HorizontalBarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {data.map((d, i) => {
        const percentage = Math.round((d.value / max) * 100)
        return (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
          >
            <div
              style={{
                width: '120px',
                fontSize: '14px',
                fontWeight: 500,
                color: COLORS.gray700,
              }}
            >
              {d.label}
            </div>
            <div
              style={{
                flex: 1,
                background: COLORS.gray100,
                borderRadius: '4px',
                height: `${height}px`,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: d.color || COLORS.primary,
                  height: '100%',
                  width: `${percentage}%`,
                  minWidth: d.value > 0 ? '20px' : '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '8px',
                }}
              >
                {showValues && d.value > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: COLORS.white,
                    }}
                  >
                    {d.value}
                  </span>
                )}
              </div>
            </div>
            {showValues && (
              <div
                style={{
                  width: '50px',
                  textAlign: 'right',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: COLORS.gray700,
                }}
              >
                {d.value}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface DonutChartProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
}

/**
 * Grafico de donut para mostrar porcentagem de compliance
 */
export function DonutChart({
  value,
  max = 100,
  size = 150,
  strokeWidth = 12,
  color = COLORS.primary,
  label,
}: DonutChartProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={COLORS.gray200}
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: color,
              lineHeight: 1,
            }}
          >
            {percentage}%
          </div>
          {label && (
            <div
              style={{
                fontSize: '11px',
                color: COLORS.gray500,
                marginTop: '4px',
              }}
            >
              {label}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Converte dados de severidade para formato do PieChart
 */
export function severityToPieData(bySeverity: {
  critical: number
  serious: number
  moderate: number
  minor: number
}): PieChartData[] {
  return [
    { label: 'Criticos', value: bySeverity.critical, color: COLORS.critical.border },
    { label: 'Serios', value: bySeverity.serious, color: COLORS.serious.border },
    { label: 'Moderados', value: bySeverity.moderate, color: COLORS.moderate.border },
    { label: 'Menores', value: bySeverity.minor, color: COLORS.minor.border },
  ].filter((d) => d.value > 0)
}

/**
 * Converte dados de principios para formato do HorizontalBarChart
 */
export function principlesToBarData(
  byPrinciple: { principleId: string; principleName: string; occurrenceCount: number }[]
): HorizontalBarChartData[] {
  return byPrinciple.map((p) => ({
    label: p.principleName,
    value: p.occurrenceCount,
    color: COLORS.primary,
  }))
}
