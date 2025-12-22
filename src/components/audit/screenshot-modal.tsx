'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface ScreenshotModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  screenshotUrl: string
  ruleId: string
}

/**
 * Modal para visualizar screenshot em tamanho grande
 * Com controles de zoom e download
 */
export function ScreenshotModal({
  open,
  onOpenChange,
  screenshotUrl,
  ruleId,
}: ScreenshotModalProps) {
  const t = useTranslations('ViolationsFilter')
  const [zoom, setZoom] = useState(100)

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))
  const handleReset = () => setZoom(100)

  const handleDownload = async () => {
    try {
      const response = await fetch(screenshotUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `screenshot-${ruleId}-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao baixar screenshot:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('screenshotOf', { rule: ruleId })}</span>
            <div className="flex items-center gap-2">
              {/* Controles de zoom */}
              <div className="flex items-center gap-1 border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs w-12 text-center">{zoom}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 w-8 p-0"
                  title={t('screenshotReset')}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              {/* Botão de download */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {t('screenshotDownload')}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Container da imagem com scroll */}
        <div className="flex-1 overflow-auto bg-muted/30 rounded-lg p-4">
          <div
            className="flex items-center justify-center min-h-[300px]"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center center',
            }}
          >
            <img
              src={screenshotUrl}
              alt={t('screenshotOf', { rule: ruleId })}
              className="max-w-full rounded-lg shadow-lg border"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
