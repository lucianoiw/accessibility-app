'use client'

import { cn } from '@/utils'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

export type DeltaType = 'violations' | 'score' | 'pages'
export type DeltaSize = 'sm' | 'md' | 'lg'

interface DeltaBadgeProps {
  value: number
  type: DeltaType
  size?: DeltaSize
  showIcon?: boolean
  showSign?: boolean
  className?: string
}

/**
 * Badge que mostra mudanca positiva/negativa com cores intuitivas
 * - Para violacoes: verde = menos (bom), vermelho = mais (ruim)
 * - Para score: verde = mais (bom), vermelho = menos (ruim)
 * - Para paginas: neutro (azul)
 */
export function DeltaBadge({
  value,
  type,
  size = 'md',
  showIcon = true,
  showSign = true,
  className,
}: DeltaBadgeProps) {
  const color = getDeltaColor(value, type)
  const formattedValue = formatDelta(value, type, showSign)

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-0.5',
    md: 'text-sm px-2 py-1 gap-1',
    lg: 'text-base px-3 py-1.5 gap-1.5',
  }

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  }

  const colorClasses = {
    positive: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    negative: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  }

  const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    >
      {showIcon && <Icon size={iconSizes[size]} className="shrink-0" />}
      <span>{formattedValue}</span>
    </span>
  )
}

/**
 * Retorna a cor para o delta
 */
function getDeltaColor(
  value: number,
  type: DeltaType
): 'positive' | 'negative' | 'neutral' {
  if (value === 0) return 'neutral'

  if (type === 'violations') {
    // Menos violacoes = bom (positivo)
    return value < 0 ? 'positive' : 'negative'
  }

  if (type === 'score') {
    // Mais score = bom (positivo)
    return value > 0 ? 'positive' : 'negative'
  }

  // Paginas: neutro
  return 'neutral'
}

/**
 * Formata o delta para exibicao
 */
function formatDelta(value: number, type: DeltaType, showSign: boolean): string {
  if (value === 0) return '0'

  const absValue = Math.abs(value)
  const prefix = showSign ? (value > 0 ? '+' : '-') : ''
  const suffix = type === 'score' ? '%' : ''

  return `${prefix}${absValue}${suffix}`
}
