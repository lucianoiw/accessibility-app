'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { Project } from '@/types'
import { updateGeneralSettings } from './actions'

interface Props {
  project: Project
}

export function GeneralSettingsForm({ project }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const t = useTranslations('SettingsForm')

  async function handleSubmit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await updateGeneralSettings(project.id, formData)
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
        <CardTitle>{t('generalTitle')}</CardTitle>
        <CardDescription>
          {t('generalDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('projectName')}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={project.name}
                placeholder={t('projectNamePlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="base_url">{t('baseUrl')}</Label>
              <Input
                id="base_url"
                name="base_url"
                type="url"
                defaultValue={project.base_url}
                placeholder={t('baseUrlPlaceholder')}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={project.description || ''}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
            />
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

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('saveChanges')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
