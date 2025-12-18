'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown, FolderPlus, Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface ProjectForSwitcher {
  id: string
  name: string
  base_url: string
}

interface TeamSwitcherProps {
  projects: ProjectForSwitcher[]
}

export function TeamSwitcher({ projects }: TeamSwitcherProps) {
  const t = useTranslations('ProjectSwitcher')
  const params = useParams()
  const router = useRouter()

  const currentProjectId = params?.id as string | undefined
  const currentProject = projects.find(p => p.id === currentProjectId)

  const handleSelect = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const handleCreateNew = () => {
    router.push('/projects/new')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 outline-none group">
        <span className="text-foreground font-semibold text-[15px] group-hover:text-primary transition-colors">
          {currentProject?.name || t('select')}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-3 py-2">
          {t('switchProject')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {projects.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {t('noProjects')}
            </div>
          ) : (
            projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => handleSelect(project.id)}
                className="cursor-pointer px-3"
              >
                <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{project.name}</span>
                {currentProjectId === project.id && (
                  <Check className="ml-2 h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleCreateNew}
          className="cursor-pointer px-3"
        >
          <FolderPlus className="mr-2 h-4 w-4 text-muted-foreground" />
          {t('createNew')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
