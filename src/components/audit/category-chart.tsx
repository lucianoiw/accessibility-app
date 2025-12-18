'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/utils'
import type { CategoryCount } from '@/lib/audit/category-mapper'

interface CategoryChartProps {
  categories: CategoryCount[]
  className?: string
}

type SortOption = 'count' | 'name'

const BAR_COLOR = '#0EA5E9' // sky-500

export function CategoryChart({ categories, className }: CategoryChartProps) {
  const t = useTranslations('AuditComponents')
  const [sortBy, setSortBy] = useState<SortOption>('count')

  const total = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.count, 0),
    [categories]
  )

  const sortedCategories = useMemo(() => {
    const sorted = [...categories]
    if (sortBy === 'count') {
      sorted.sort((a, b) => b.count - a.count)
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    }
    return sorted.map((cat, idx) => ({
      ...cat,
      rank: idx + 1,
    }))
  }, [categories, sortBy])

  const maxCount = useMemo(
    () => Math.max(...categories.map((c) => c.count), 1),
    [categories]
  )

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{t('issuesByCategory')}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('issuesByCategoryTooltip')}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-sm">{t('issuesByCategoryTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue placeholder={t('sortByCount')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">{t('sortByCount')}</SelectItem>
              <SelectItem value="name">A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-muted-foreground text-sm">
          {t('total')}
          <span className="block text-3xl font-bold text-foreground">{total}</span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Table-style layout for better readability */}
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_3fr_3rem] gap-2 text-xs text-muted-foreground uppercase tracking-wider pb-2 border-b">
            <span>#</span>
            <span>{t('categoryHeader')}</span>
            <span>{t('issues')}</span>
            <span className="text-right">{t('countHeader')}</span>
          </div>

          {/* Rows */}
          {sortedCategories.map((cat) => {
            const barWidth = maxCount > 0 ? (cat.count / maxCount) * 100 : 0

            return (
              <div
                key={cat.id}
                className="grid grid-cols-[2rem_1fr_3fr_3rem] gap-2 items-center py-1.5 hover:bg-muted/50 rounded transition-colors"
              >
                <span className="text-sm text-muted-foreground">{cat.rank}</span>
                <span className="text-sm font-medium truncate">{cat.name}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: BAR_COLOR,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm text-right font-medium">{cat.count}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
