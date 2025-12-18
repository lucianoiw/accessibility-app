'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import type { Project } from '@/types'
import { updateAuditDefaults } from '../actions'

interface Props {
  project: Project
}

export function DefaultsSettingsForm({ project }: Props) {
  const t = useTranslations('SettingsForm')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await updateAuditDefaults(project.id, formData)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: t('savedSuccess') })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('defaultsTitle')}</CardTitle>
        <CardDescription>
          {t('defaultsDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>{t('wcagLevels')}</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wcag_a"
                  name="wcag_a"
                  defaultChecked={project.default_wcag_levels.includes('A')}
                />
                <Label htmlFor="wcag_a" className="font-normal">WCAG A</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wcag_aa"
                  name="wcag_aa"
                  defaultChecked={project.default_wcag_levels.includes('AA')}
                />
                <Label htmlFor="wcag_aa" className="font-normal">WCAG AA</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wcag_aaa"
                  name="wcag_aaa"
                  defaultChecked={project.default_wcag_levels.includes('AAA')}
                />
                <Label htmlFor="wcag_aaa" className="font-normal">WCAG AAA</Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('wcagLevelsHelp')}
            </p>
          </div>

          <div className="space-y-3">
            <Label>{t('additionalStandards')}</Label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_abnt"
                  name="include_abnt"
                  defaultChecked={project.default_include_abnt}
                />
                <Label htmlFor="include_abnt" className="font-normal">
                  {t('includeAbnt')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_emag"
                  name="include_emag"
                  defaultChecked={project.default_include_emag}
                />
                <Label htmlFor="include_emag" className="font-normal">
                  {t('includeEmag')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_coga"
                  name="include_coga"
                  defaultChecked={project.default_include_coga}
                />
                <Label htmlFor="include_coga" className="font-normal">
                  {t('includeCoga')}
                </Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('additionalStandardsHelp')}
            </p>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('saveConfig')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
