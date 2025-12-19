'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface DeleteAuditButtonProps {
  auditId: string
  projectId: string
  /** Variant for the button */
  variant?: 'default' | 'icon' | 'ghost'
  /** Callback after successful deletion */
  onDeleted?: () => void
}

export function DeleteAuditButton({
  auditId,
  projectId,
  variant = 'default',
  onDeleted,
}: DeleteAuditButtonProps) {
  const t = useTranslations('Audit')
  const tCommon = useTranslations('Common')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/audits/${auditId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao excluir')
      }

      setOpen(false)

      if (onDeleted) {
        onDeleted()
      } else {
        // Redirect to project audits list
        router.push(`/projects/${projectId}/audits`)
        router.refresh()
      }
    } catch (error) {
      console.error('Error deleting audit:', error)
      setIsDeleting(false)
    }
  }

  const buttonContent =
    variant === 'icon' ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <Trash2 className="text-muted-foreground hover:text-destructive" />
            <span className="sr-only">{t('deleteAudit')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('deleteAudit')}</TooltipContent>
      </Tooltip>
    ) : variant === 'ghost' ? (
      <Button variant="ghost" size="sm">
        <Trash2 />
        {t('deleteAudit')}
      </Button>
    ) : (
      <Button variant="destructive" size="sm">
        <Trash2 />
        {t('deleteAudit')}
      </Button>
    )

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {buttonContent}
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteAuditConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteAuditConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {tCommon('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className={buttonVariants({ variant: 'destructive' })}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tCommon('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
