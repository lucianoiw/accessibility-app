'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Clock, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Project, ScheduleFrequency } from '@/types'

interface Props {
  project: Project
}

const DAYS_OF_WEEK = [
  { value: 0, labelKey: 'sunday' },
  { value: 1, labelKey: 'monday' },
  { value: 2, labelKey: 'tuesday' },
  { value: 3, labelKey: 'wednesday' },
  { value: 4, labelKey: 'thursday' },
  { value: 5, labelKey: 'friday' },
  { value: 6, labelKey: 'saturday' },
]

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'UTC', label: 'UTC' },
]

export function ScheduleSettingsForm({ project }: Props) {
  const t = useTranslations('ScheduleSettings')
  const tDays = useTranslations('DaysOfWeek')
  const tCommon = useTranslations('Common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [enabled, setEnabled] = useState(project.schedule_enabled)
  const [frequency, setFrequency] = useState<ScheduleFrequency>(project.schedule_frequency)
  const [dayOfWeek, setDayOfWeek] = useState(project.schedule_day_of_week)
  const [dayOfMonth, setDayOfMonth] = useState(project.schedule_day_of_month)
  const [hour, setHour] = useState(project.schedule_hour)
  const [timezone, setTimezone] = useState(project.schedule_timezone)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}/schedule`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schedule_enabled: enabled,
            schedule_frequency: frequency,
            schedule_day_of_week: dayOfWeek,
            schedule_day_of_month: dayOfMonth,
            schedule_hour: hour,
            schedule_timezone: timezone,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Erro ao salvar')
        }

        setMessage({ type: 'success', text: t('savedSuccess') })
        router.refresh()
      } catch (err) {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Erro ao salvar configuração',
        })
      }
    })
  }

  // Formatar próxima execução
  const formatNextRun = () => {
    if (!project.next_scheduled_audit_at) return null
    const date = new Date(project.next_scheduled_audit_at)
    return date.toLocaleString('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const formatLastRun = () => {
    if (!project.last_scheduled_audit_at) return null
    const date = new Date(project.last_scheduled_audit_at)
    return date.toLocaleString('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t('title')}</CardTitle>
          </div>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ativar/Desativar */}
            <div className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/50">
              <Checkbox
                id="schedule_enabled"
                checked={enabled}
                onCheckedChange={(checked) => setEnabled(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="schedule_enabled" className="text-base font-medium cursor-pointer">
                  {t('enableSchedule')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('enableScheduleHelp')}
                </p>
              </div>
            </div>

            {enabled && (
              <>
                {/* Frequência */}
                <div className="space-y-3">
                  <Label>{t('frequency')}</Label>
                  <Select
                    value={frequency}
                    onValueChange={(value) => setFrequency(value as ScheduleFrequency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t('frequencyDaily')}</SelectItem>
                      <SelectItem value="weekly">{t('frequencyWeekly')}</SelectItem>
                      <SelectItem value="monthly">{t('frequencyMonthly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dia da Semana (para weekly) */}
                {frequency === 'weekly' && (
                  <div className="space-y-3">
                    <Label>{t('dayOfWeek')}</Label>
                    <Select
                      value={String(dayOfWeek)}
                      onValueChange={(value) => setDayOfWeek(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {tDays(day.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Dia do Mês (para monthly) */}
                {frequency === 'monthly' && (
                  <div className="space-y-3">
                    <Label>{t('dayOfMonth')}</Label>
                    <Select
                      value={String(dayOfMonth)}
                      onValueChange={(value) => setDayOfMonth(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            {t('dayNumber', { day })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {dayOfMonth > 28 && (
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {t('dayOfMonthWarning')}
                      </p>
                    )}
                  </div>
                )}

                {/* Hora */}
                <div className="space-y-3">
                  <Label>{t('hour')}</Label>
                  <Select
                    value={String(hour)}
                    onValueChange={(value) => setHour(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {String(h).padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timezone */}
                <div className="space-y-3">
                  <Label>{t('timezone')}</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Status atual */}
            {project.schedule_enabled && (
              <div className="space-y-2 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{t('scheduleStatus')}</span>
                </div>
                <div className="text-sm space-y-1">
                  {formatNextRun() && (
                    <p>
                      <span className="text-muted-foreground">{t('nextRun')}:</span>{' '}
                      <span className="font-medium">{formatNextRun()}</span>
                    </p>
                  )}
                  {formatLastRun() && (
                    <p>
                      <span className="text-muted-foreground">{t('lastRun')}:</span>{' '}
                      <span className="font-medium">{formatLastRun()}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {message && (
              <div
                className={`p-3 rounded-md text-sm flex items-center gap-2 ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {message.text}
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tCommon('save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
