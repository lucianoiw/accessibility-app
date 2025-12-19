'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, FileSpreadsheet, FileJson, Loader2, Check, X, ClipboardCheck } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { ReportType, ReportStatus, Report } from '@/types'

interface ExportButtonProps {
  auditId: string
  projectId?: string
  showEmag?: boolean
  disabled?: boolean
}

interface ReportOption {
  type: ReportType
  label: string
  description: string
  icon: React.ReactNode
}

export function ExportButton({ auditId, projectId, showEmag = false, disabled }: ExportButtonProps) {
  const t = useTranslations('ExportButton')
  const [reports, setReports] = useState<Report[]>([])
  const [generating, setGenerating] = useState<ReportType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const REPORT_OPTIONS: ReportOption[] = useMemo(() => [
    {
      type: 'executive_pdf',
      label: t('executiveReport'),
      description: t('executiveReportDescription'),
      icon: <FileText className="h-4 w-4" />,
    },
    {
      type: 'technical_pdf',
      label: t('technicalReport'),
      description: t('technicalReportDescription'),
      icon: <FileText className="h-4 w-4" />,
    },
    {
      type: 'csv',
      label: t('exportCsv'),
      description: t('exportCsvDescription'),
      icon: <FileSpreadsheet className="h-4 w-4" />,
    },
    {
      type: 'json',
      label: t('exportJson'),
      description: t('exportJsonDescription'),
      icon: <FileJson className="h-4 w-4" />,
    },
  ], [t])

  // Buscar relatorios existentes
  useEffect(() => {
    fetchReports()
  }, [auditId])

  // Polling para relatorios em geracao
  useEffect(() => {
    const pendingReport = reports.find(
      (r) => r.status === 'pending' || r.status === 'generating'
    )

    if (pendingReport) {
      setGenerating(pendingReport.type as ReportType)

      const interval = setInterval(async () => {
        const res = await fetch(`/api/reports/${pendingReport.id}`)
        if (res.ok) {
          const { report } = await res.json()
          if (report.status === 'completed' || report.status === 'failed') {
            setGenerating(null)
            fetchReports()
          }
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [reports])

  async function fetchReports() {
    try {
      const res = await fetch(`/api/reports?auditId=${auditId}`)
      if (res.ok) {
        const { reports: fetchedReports } = await res.json()
        setReports(fetchedReports || [])
      }
    } catch (err) {
      console.error('Erro ao buscar relatorios:', err)
    }
  }

  async function generateReport(type: ReportType) {
    setError(null)
    setGenerating(type)

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId, type }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar relatorio')
      }

      // Recarregar lista de relatorios
      fetchReports()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setGenerating(null)
    }
  }

  function getReportStatus(type: ReportType): Report | undefined {
    return reports.find((r) => r.type === type)
  }

  function downloadReport(report: Report) {
    if (report.file_url) {
      window.open(report.file_url, '_blank')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download />
          {t('export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t('generateReport')}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {REPORT_OPTIONS.map((option) => {
          const existingReport = getReportStatus(option.type)
          const isGenerating = generating === option.type

          return (
            <DropdownMenuItem
              key={option.type}
              className="flex items-start gap-3 p-3 cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                if (existingReport?.status === 'completed') {
                  downloadReport(existingReport)
                } else if (!isGenerating) {
                  generateReport(option.type)
                }
              }}
              disabled={isGenerating}
            >
              <div className="mt-0.5">
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : existingReport?.status === 'completed' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : existingReport?.status === 'failed' ? (
                  <X className="h-4 w-4 text-red-600" />
                ) : (
                  option.icon
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-muted-foreground">
                  {isGenerating
                    ? t('generating')
                    : existingReport?.status === 'completed'
                      ? t('clickToDownload')
                      : existingReport?.status === 'failed'
                        ? t('failedClickToRetry')
                        : option.description}
                </div>
                {existingReport?.status === 'completed' && existingReport.file_size && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(existingReport.file_size)}
                  </div>
                )}
              </div>
            </DropdownMenuItem>
          )
        })}

        {projectId && showEmag && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('compliance')}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link
                href={`/projects/${projectId}/audits/${auditId}/emag`}
                className="flex items-start gap-3 p-3 cursor-pointer"
              >
                <div className="mt-0.5">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{t('emagReport')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('emagReportDescription')}
                  </div>
                </div>
              </Link>
            </DropdownMenuItem>
          </>
        )}

        {error && (
          <>
            <DropdownMenuSeparator />
            <div className="p-3 text-xs text-red-600">{error}</div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
