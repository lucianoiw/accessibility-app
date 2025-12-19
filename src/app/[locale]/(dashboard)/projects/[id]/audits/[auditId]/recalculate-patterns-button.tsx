'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface RecalculatePatternsButtonProps {
  auditId: string
}

export function RecalculatePatternsButton({ auditId }: RecalculatePatternsButtonProps) {
  const t = useTranslations('Audit')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRecalculate = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/audits/${auditId}/recalculate-patterns`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao recalcular')
      }

      // Recarregar a página para mostrar os novos valores
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRecalculate}
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        {loading ? t('recalculating') : t('recalculatePatterns')}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
