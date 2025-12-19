'use client'

import { cn } from '@/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { TrendDirection } from '@/types'

interface TrendIndicatorProps {
  direction: TrendDirection
  value?: number
  type?: 'score' | 'violations'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

/**
 * Indicador de tendencia com seta e valor opcional
 * - Para score: up = verde (bom), down = vermelho (ruim)
 * - Para violations: up = vermelho (ruim), down = verde (bom)
 */
export function TrendIndicator({
  direction,
  value,
  type = 'score',
  size = 'md',
  showLabel = false,
  className,
}: TrendIndicatorProps) {
  const color = getTrendColor(direction, type)

  const sizeClasses = {
    sm: 'text-xs gap-0.5',
    md: 'text-sm gap-1',
    lg: 'text-base gap-1.5',
  }

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  }

  const colorClasses = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  }

  const Icon =
    direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus

  const label = getLabel(direction)

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    >
      <Icon size={iconSizes[size]} className="shrink-0" />
      {value !== undefined && (
        <span>
          {value > 0 ? '+' : ''}
          {value}%
        </span>
      )}
      {showLabel && <span className="ml-1">{label}</span>}
    </span>
  )
}

function getTrendColor(
  direction: TrendDirection,
  type: 'score' | 'violations'
): 'positive' | 'negative' | 'neutral' {
  if (direction === 'stable') return 'neutral'

  const isPositive =
    (type === 'score' && direction === 'up') ||
    (type === 'violations' && direction === 'down')

  return isPositive ? 'positive' : 'negative'
}

function getLabel(direction: TrendDirection): string {
  switch (direction) {
    case 'up':
      return 'Subindo'
    case 'down':
      return 'Descendo'
    case 'stable':
      return 'Estavel'
  }
}
