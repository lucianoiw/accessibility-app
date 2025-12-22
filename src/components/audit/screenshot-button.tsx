'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ScreenshotModal } from './screenshot-modal'
import { Camera, Loader2, ImageOff, ZoomIn } from 'lucide-react'
import type { AggregatedViolation } from '@/types'

interface ScreenshotButtonProps {
  violation: AggregatedViolation
  /** Classe CSS adicional */
  className?: string
}

/**
 * Botão para capturar/visualizar screenshot de uma violação
 *
 * - Se já tem screenshot_url: mostra thumbnail + abre modal ao clicar
 * - Se não tem: mostra botão "Capturar" que chama a API
 */
export function ScreenshotButton({ violation, className = '' }: ScreenshotButtonProps) {
  const t = useTranslations('ViolationsFilter')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(violation.screenshot_url)
  const [modalOpen, setModalOpen] = useState(false)

  const handleCapture = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/violations/${violation.id}/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t('screenshotError'))
        return
      }

      setScreenshotUrl(data.screenshotUrl)
      // Abrir modal para mostrar o screenshot capturado
      setModalOpen(true)
    } catch {
      setError(t('screenshotError'))
    } finally {
      setIsLoading(false)
    }
  }

  // Se já tem screenshot, mostrar thumbnail
  if (screenshotUrl) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className={`group relative rounded-lg overflow-hidden border bg-muted/50 hover:border-primary transition-colors ${className}`}
          title={t('viewScreenshot')}
        >
          {/* Thumbnail */}
          <img
            src={screenshotUrl}
            alt={t('screenshotOf', { rule: violation.rule_id })}
            className="w-full h-24 object-cover object-top"
          />
          {/* Overlay com ícone de zoom */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        <ScreenshotModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          screenshotUrl={screenshotUrl}
          ruleId={violation.rule_id}
        />
      </>
    )
  }

  // Se não tem screenshot, mostrar botão de captura
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCapture}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('screenshotLoading')}
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            {t('captureScreenshot')}
          </>
        )}
      </Button>

      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <ImageOff className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  )
}
