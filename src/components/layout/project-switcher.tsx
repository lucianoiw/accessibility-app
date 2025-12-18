'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Check, ChevronsUpDown, FolderPlus, Globe } from 'lucide-react'
import { cn } from '@/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

export interface ProjectForSwitcher {
  id: string
  name: string
  base_url: string
}

interface ProjectSwitcherProps {
  projects: ProjectForSwitcher[]
}

export function ProjectSwitcher({ projects }: ProjectSwitcherProps) {
  const t = useTranslations('ProjectSwitcher')
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const params = useParams()
  const router = useRouter()

  const currentProjectId = params?.id as string | undefined
  const currentProject = projects.find(p => p.id === currentProjectId)

  const filteredProjects = React.useMemo(() => {
    if (!search.trim()) return projects
    const searchLower = search.toLowerCase()
    return projects.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.base_url.toLowerCase().includes(searchLower)
    )
  }, [projects, search])

  const handleSelect = (projectId: string) => {
    setOpen(false)
    setSearch('')
    router.push(`/projects/${projectId}`)
  }

  const handleCreateNew = () => {
    setOpen(false)
    setSearch('')
    router.push('/projects/new')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={t('select')}
          className="w-[200px] justify-between"
        >
          {currentProject ? (
            <span className="flex items-center gap-2 truncate">
              <Globe className="h-4 w-4 shrink-0 opacity-70" />
              <span className="truncate">{currentProject.name}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4 shrink-0" />
              {t('select')}
            </span>
          )}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2">
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {filteredProjects.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t('noProjectsFound')}
            </div>
          ) : (
            <div className="p-1">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {t('projects')}
              </p>
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect(project.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:bg-accent focus:text-accent-foreground',
                    currentProjectId === project.id && 'bg-accent'
                  )}
                >
                  <Globe className="h-4 w-4 opacity-70" />
                  <span className="truncate flex-1 text-left">{project.name}</span>
                  {currentProjectId === project.id && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <Separator />
        <div className="p-1">
          <button
            onClick={handleCreateNew}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:bg-accent focus:text-accent-foreground'
            )}
          >
            <FolderPlus className="h-4 w-4" />
            {t('createNew')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
