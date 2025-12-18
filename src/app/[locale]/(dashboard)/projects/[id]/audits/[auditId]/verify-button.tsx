'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AggregatedViolation, ViolationStatus, VerificationResult } from '@/types'
import { useRouter } from 'next/navigation'

interface Props {
  violation: AggregatedViolation
}

export function VerifyButton({ violation }: Props) {
  const t = useTranslations('VerifyButton')
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(violation.verification_result)
  const [status, setStatus] = useState<ViolationStatus>(violation.status)
  const router = useRouter()

  const handleVerify = async () => {
    setIsVerifying(true)
    try {
      const response = await fetch(`/api/violations/${violation.id}/verify`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('verifyError'))
      }

      const data = await response.json()
      setResult(data.result)
      setStatus(data.status)
      router.refresh()
    } catch (error) {
      console.error('Verify error:', error)
      alert(error instanceof Error ? error.message : t('verifyError'))
    } finally {
      setIsVerifying(false)
    }
  }

  const handleStatusChange = async (newStatus: ViolationStatus) => {
    try {
      const response = await fetch(`/api/violations/${violation.id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('updateStatusError'))
      }

      setStatus(newStatus)
      router.refresh()
    } catch (error) {
      console.error('Update status error:', error)
      alert(error instanceof Error ? error.message : t('updateStatusError'))
    }
  }

  const statusLabels = useMemo(() => ({
    open: t('statusOpen'),
    in_progress: t('statusInProgress'),
    fixed: t('statusFixed'),
    ignored: t('statusIgnored'),
    false_positive: t('statusFalsePositive'),
  }), [t])

  const statusColors: Record<ViolationStatus, string> = {
    open: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    fixed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    ignored: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    false_positive: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Status badge */}
      {status !== 'open' && (
        <span className={`text-xs px-2 py-0.5 rounded ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
      )}

      {/* Last verification result */}
      {result && (
        <div className="text-xs text-muted-foreground text-right">
          <div>
            {result.remaining === 0 ? (
              <span className="text-green-600 dark:text-green-400">{t('allFixed')}</span>
            ) : (
              <>
                <span className="font-medium">{result.remaining}</span> {t('remaining')}
                {result.fixed > 0 && (
                  <span className="text-green-600 dark:text-green-400 ml-1">
                    ({result.fixed} {t('fixed')})
                  </span>
                )}
              </>
            )}
          </div>
          <div className="text-[10px]">
            {t('verified')}: {new Date(result.checked_at).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleVerify}
          disabled={isVerifying || status === 'in_progress'}
          className="text-xs h-7"
        >
          {isVerifying ? (
            <>
              <span className="animate-spin mr-1">&#9696;</span>
              {t('verifying')}
            </>
          ) : (
            t('verifyFix')
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <span className="sr-only">{t('openMenu')}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleStatusChange('fixed')}
              disabled={status === 'fixed'}
            >
              {t('markAsFixed')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStatusChange('ignored')}
              disabled={status === 'ignored'}
            >
              {t('ignore')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStatusChange('false_positive')}
              disabled={status === 'false_positive'}
            >
              {t('falsePositive')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleStatusChange('open')}
              disabled={status === 'open'}
            >
              {t('reopen')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
