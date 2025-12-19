import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Link } from '@/i18n/navigation'
import { Clock } from 'lucide-react'
import type { Project } from '@/types'

export default async function ProjectsPage() {
  const t = await getTranslations('Project')
  const tSchedule = await getTranslations('ScheduleSettings')
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false }) as { data: Project[] | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('title')}</h2>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">{t('newProject')}</Link>
        </Button>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="truncate">
                        {project.base_url}
                      </CardDescription>
                    </div>
                    {project.schedule_enabled && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                            <Clock className="h-3 w-3" />
                            <span className="sr-only sm:not-sr-only">{tSchedule('scheduled')}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {tSchedule('scheduledTooltip')}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {project.description || t('noDescription')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {t('noProjects')}
            </p>
            <Button asChild>
              <Link href="/projects/new">{t('createFirst')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
