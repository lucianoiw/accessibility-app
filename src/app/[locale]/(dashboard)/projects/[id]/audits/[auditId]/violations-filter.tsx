'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Autocomplete } from '@/components/ui/autocomplete'
import type { AggregatedViolation, ImpactLevel, ViolationStatus, ConfidenceLevel, ViolationOverride } from '@/types'
import { getRuleLabel } from '@/lib/audit/rule-labels'
import { VerifyButton } from './verify-button'
import { SuggestButton } from './suggest-button'
import { ConfidenceBadge } from '@/components/audit/confidence-badge'
import { ClassifyModal, HelpModal } from '@/components/audit'
import { Copy, Check, ChevronDown, ChevronUp, X, CheckCircle2, AlertCircle, HelpCircle, FlaskConical, AlertTriangle, Code, Link as LinkIcon, Hash } from 'lucide-react'

interface Props {
  violations: AggregatedViolation[]
  includeAbnt: boolean
  includeEmag?: boolean
  overrides?: ViolationOverride[]
  projectId: string
}

type SortOption = 'priority' | 'occurrences' | 'pages' | 'impact'
type SelectorMode = 'selector' | 'xpath'

// Lista de regras COGA (Acessibilidade Cognitiva)
const COGA_RULES = [
  'legibilidade-texto-complexo',
  'siglas-sem-expansao',
  'linguagem-inconsistente',
  'timeout-sem-aviso',
  'captcha-sem-alternativa',
  'animacao-sem-pause',
]

// Helper para encontrar override de uma violacao
function findOverrideForViolation(
  violation: AggregatedViolation,
  overrides: ViolationOverride[]
): ViolationOverride | null {
  // Primeiro tenta match exato por rule_id + xpath
  const firstXpath = violation.unique_elements?.[0]?.xpath
  if (firstXpath) {
    const exactMatch = overrides.find(
      o => o.rule_id === violation.rule_id && o.element_xpath === firstXpath
    )
    if (exactMatch) return exactMatch
  }

  // Depois tenta match apenas por rule_id (sem elemento especifico)
  const ruleMatch = overrides.find(
    o => o.rule_id === violation.rule_id && !o.element_xpath && !o.element_content_hash
  )
  if (ruleMatch) return ruleMatch

  return null
}

// Helper para obter o status efetivo de uma violacao (considerando override)
function getEffectiveStatus(
  violation: AggregatedViolation,
  overrides: ViolationOverride[]
): ViolationStatus {
  const override = findOverrideForViolation(violation, overrides)
  if (override) {
    // override_type: 'false_positive' | 'ignored' | 'fixed' -> mapeia diretamente para ViolationStatus
    return override.override_type as ViolationStatus
  }
  return violation.status
}

export function ViolationsFilter({ violations, includeAbnt, includeEmag, overrides = [], projectId }: Props) {
  const t = useTranslations('ViolationsFilter')
  const tWcag = useTranslations('WcagPartial')

  // Helper para traduzir mensagens que podem ser chaves de tradução
  // Nota: algumas traduções WcagPartial têm placeholders que não temos aqui,
  // então usamos tWcag.raw() para pegar a string sem formatação
  const translateMessage = useCallback((message: string): string => {
    if (!message) return ''
    // Detecta se é uma chave de tradução WcagPartial (ex: "WcagPartial.inputSemAutocomplete.message")
    if (message.startsWith('WcagPartial.')) {
      const key = message.replace('WcagPartial.', '')
      try {
        // Usa .raw() para pegar a string sem tentar formatar placeholders
        const rawMessage = tWcag.raw(key)
        if (typeof rawMessage === 'string') {
          // Remove placeholders não preenchidos para exibição limpa
          return rawMessage.replace(/\{[^}]+\}/g, '...').replace(/\.\.\.\.\.\./g, '...')
        }
        return message
      } catch {
        return message
      }
    }
    return message
  }, [tWcag])

  // Selector display mode
  const [selectorMode, setSelectorMode] = useState<SelectorMode>('selector')

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUrl, setSelectedUrl] = useState<string>('')
  const [selectedImpacts, setSelectedImpacts] = useState<ImpactLevel[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedRule, setSelectedRule] = useState<string>('')
  const [showCustomOnly, setShowCustomOnly] = useState(false)
  const [showAxeOnly, setShowAxeOnly] = useState(false)
  const [selectedAbnt, setSelectedAbnt] = useState<string>('')
  const [selectedEmag, setSelectedEmag] = useState<string>('')
  const [selectedStatuses, setSelectedStatuses] = useState<ViolationStatus[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('priority')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showCogaOnly, setShowCogaOnly] = useState(false)
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel | 'all'>('all')
  const [showExperimental, setShowExperimental] = useState(true)

  // Get unique values for filters
  const uniqueRules = useMemo(() => {
    const rules = new Map<string, string>()
    violations.forEach((v) => {
      if (!rules.has(v.rule_id)) {
        rules.set(v.rule_id, getRuleLabel(v.rule_id))
      }
    })
    // Sort by label
    return Array.from(rules.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [violations])

  const uniqueAbntSections = useMemo(() => {
    const sections = new Set<string>()
    violations.forEach((v) => {
      if (v.abnt_section) sections.add(v.abnt_section)
    })
    return Array.from(sections).sort()
  }, [violations])

  const uniqueEmagSections = useMemo(() => {
    const sections = new Set<string>()
    violations.forEach((v) => {
      if (v.emag_recommendations) {
        v.emag_recommendations.forEach((rec) => sections.add(rec))
      }
    })
    return Array.from(sections).sort((a, b) => {
      // Ordenar por número da seção (ex: "1.1" < "2.3" < "10.1")
      const [aMain, aSub] = a.split('.').map(Number)
      const [bMain, bSub] = b.split('.').map(Number)
      if (aMain !== bMain) return aMain - bMain
      return aSub - bSub
    })
  }, [violations])

  // Get unique URLs from all violations' affected_pages
  // Ordenado por tamanho (menor primeiro) e depois alfabeticamente
  const uniqueUrls = useMemo(() => {
    const urls = new Set<string>()
    violations.forEach((v) => {
      if (v.affected_pages) {
        v.affected_pages.forEach((url) => urls.add(url))
      }
    })
    return Array.from(urls).sort((a, b) => {
      // Primeiro por tamanho
      if (a.length !== b.length) return a.length - b.length
      // Depois alfabeticamente
      return a.localeCompare(b)
    })
  }, [violations])

  // Filter violations
  const filteredViolations = useMemo(() => {
    let result = [...violations]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (v) =>
          v.rule_id.toLowerCase().includes(term) ||
          getRuleLabel(v.rule_id).toLowerCase().includes(term) ||
          v.help.toLowerCase().includes(term) ||
          v.description.toLowerCase().includes(term) ||
          v.sample_selector.toLowerCase().includes(term)
      )
    }

    // URL filter - show only violations that affect the selected URL
    if (selectedUrl) {
      result = result.filter(
        (v) => v.affected_pages && v.affected_pages.includes(selectedUrl)
      )
    }

    // Impact filter
    if (selectedImpacts.length > 0) {
      result = result.filter((v) => selectedImpacts.includes(v.impact))
    }

    // WCAG Level filter
    if (selectedLevels.length > 0) {
      result = result.filter((v) => v.wcag_level && selectedLevels.includes(v.wcag_level))
    }

    // Rule filter
    if (selectedRule) {
      result = result.filter((v) => v.rule_id === selectedRule)
    }

    // Custom rules filter
    if (showCustomOnly) {
      result = result.filter((v) => v.is_custom_rule)
    }
    if (showAxeOnly) {
      result = result.filter((v) => !v.is_custom_rule)
    }

    // ABNT filter
    if (selectedAbnt) {
      result = result.filter((v) => v.abnt_section === selectedAbnt)
    }

    // eMAG filter
    if (selectedEmag) {
      result = result.filter(
        (v) => v.emag_recommendations && v.emag_recommendations.includes(selectedEmag)
      )
    }

    // Status filter - considera override se existir
    if (selectedStatuses.length > 0) {
      result = result.filter((v) => {
        const effectiveStatus = getEffectiveStatus(v, overrides)
        return selectedStatuses.includes(effectiveStatus)
      })
    }

    // COGA filter
    if (showCogaOnly) {
      result = result.filter((v) => COGA_RULES.includes(v.rule_id))
    }

    // Confidence filter
    if (confidenceFilter !== 'all') {
      result = result.filter((v) => v.confidence_level === confidenceFilter)
    }

    // Experimental filter
    if (!showExperimental) {
      result = result.filter((v) => !v.is_experimental)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priority - a.priority
        case 'occurrences':
          return b.occurrences - a.occurrences
        case 'pages':
          return b.page_count - a.page_count
        case 'impact':
          const impactOrder: Record<ImpactLevel, number> = {
            critical: 4,
            serious: 3,
            moderate: 2,
            minor: 1,
          }
          return impactOrder[b.impact] - impactOrder[a.impact]
        default:
          return 0
      }
    })

    return result
  }, [violations, searchTerm, selectedUrl, selectedImpacts, selectedLevels, selectedRule, showCustomOnly, showAxeOnly, selectedAbnt, selectedEmag, selectedStatuses, showCogaOnly, confidenceFilter, showExperimental, sortBy])

  // Toggle impact filter
  const toggleImpact = (impact: ImpactLevel) => {
    setSelectedImpacts((prev) =>
      prev.includes(impact) ? prev.filter((i) => i !== impact) : [...prev, impact]
    )
  }

  // Toggle level filter
  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    )
  }

  // Toggle status filter
  const toggleStatus = (status: ViolationStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedUrl('')
    setSelectedImpacts([])
    setSelectedLevels([])
    setSelectedRule('')
    setShowCustomOnly(false)
    setShowAxeOnly(false)
    setShowCogaOnly(false)
    setSelectedAbnt('')
    setSelectedEmag('')
    setSelectedStatuses([])
    setConfidenceFilter('all')
    setShowExperimental(true)
    setSortBy('priority')
  }

  const hasActiveFilters =
    searchTerm ||
    selectedUrl ||
    selectedImpacts.length > 0 ||
    selectedLevels.length > 0 ||
    selectedRule ||
    showCustomOnly ||
    showAxeOnly ||
    showCogaOnly ||
    selectedAbnt ||
    selectedEmag ||
    selectedStatuses.length > 0 ||
    confidenceFilter !== 'all' ||
    !showExperimental

  // Impact labels for UI
  const impactLabels = useMemo(() => ({
    critical: t('critical'),
    serious: t('serious'),
    moderate: t('moderate'),
    minor: t('minor'),
  }), [t])

  // Status labels for UI
  const statusLabels = useMemo(() => ({
    open: t('statusOpen'),
    in_progress: t('statusInProgress'),
    fixed: t('statusFixed'),
    ignored: t('statusIgnored'),
    false_positive: t('statusFalsePositive'),
  }), [t])

  // Gerar lista de chips de filtros ativos
  const activeFilterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = []

    if (searchTerm) {
      chips.push({ label: `"${searchTerm}"`, onRemove: () => setSearchTerm('') })
    }
    if (selectedUrl) {
      const shortUrl = selectedUrl.length > 30 ? selectedUrl.substring(0, 30) + '...' : selectedUrl
      chips.push({ label: shortUrl, onRemove: () => setSelectedUrl('') })
    }
    selectedImpacts.forEach((impact) => {
      chips.push({ label: impactLabels[impact], onRemove: () => toggleImpact(impact) })
    })
    selectedStatuses.forEach((status) => {
      chips.push({ label: statusLabels[status], onRemove: () => toggleStatus(status) })
    })
    selectedLevels.forEach((level) => {
      chips.push({ label: `WCAG ${level}`, onRemove: () => toggleLevel(level) })
    })
    if (showCustomOnly) {
      chips.push({ label: 'BR', onRemove: () => setShowCustomOnly(false) })
    }
    if (showAxeOnly) {
      chips.push({ label: 'axe-core', onRemove: () => setShowAxeOnly(false) })
    }
    if (showCogaOnly) {
      chips.push({ label: 'COGA', onRemove: () => setShowCogaOnly(false) })
    }
    if (selectedAbnt) {
      chips.push({ label: selectedAbnt, onRemove: () => setSelectedAbnt('') })
    }
    if (selectedEmag) {
      chips.push({ label: `eMAG ${selectedEmag}`, onRemove: () => setSelectedEmag('') })
    }
    if (selectedRule) {
      chips.push({ label: getRuleLabel(selectedRule), onRemove: () => setSelectedRule('') })
    }
    if (confidenceFilter !== 'all') {
      const confidenceLabels = {
        certain: t('confidenceCertain'),
        likely: t('confidenceLikely'),
        needs_review: t('confidenceNeedsReview'),
      }
      chips.push({ label: confidenceLabels[confidenceFilter], onRemove: () => setConfidenceFilter('all') })
    }
    if (!showExperimental) {
      chips.push({ label: t('hideExperimental'), onRemove: () => setShowExperimental(true) })
    }

    return chips
  }, [searchTerm, selectedUrl, selectedImpacts, selectedStatuses, selectedLevels, showCustomOnly, showAxeOnly, showCogaOnly, selectedAbnt, selectedEmag, selectedRule, confidenceFilter, showExperimental, impactLabels, statusLabels, t])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{t('filters')}</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm">
            {t('search')}
          </Label>
          <Input
            id="search"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* URL Filter - Autocomplete */}
        {uniqueUrls.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm">
              {t('filterByPage')} {selectedUrl && <Badge variant="secondary" className="ml-2 text-xs">{uniqueUrls.indexOf(selectedUrl) + 1} {t('of')} {uniqueUrls.length}</Badge>}
            </Label>
            <Autocomplete
              options={uniqueUrls.map((url) => ({
                value: url,
                label: url,
              }))}
              value={selectedUrl}
              onValueChange={setSelectedUrl}
              placeholder={t('searchPagesPlaceholder', { count: uniqueUrls.length })}
              emptyMessage={t('noUrlFound')}
              className="max-w-2xl"
            />
            {selectedUrl && (
              <p className="text-xs text-muted-foreground">
                <a href={selectedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{selectedUrl}</a>
              </p>
            )}
          </div>
        )}

        {/* Filtros Essenciais - Sempre visíveis */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Impact Filter */}
          <div className="space-y-2">
            <Label className="text-sm">{t('severity')}</Label>
            <div className="flex flex-wrap gap-2">
              {(['critical', 'serious', 'moderate', 'minor'] as ImpactLevel[]).map((impact) => (
                <Badge
                  key={impact}
                  variant={selectedImpacts.includes(impact) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    selectedImpacts.includes(impact)
                      ? impact === 'critical'
                        ? 'bg-red-600 hover:bg-red-700'
                        : impact === 'serious'
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : impact === 'moderate'
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                      : ''
                  }`}
                  onClick={() => toggleImpact(impact)}
                >
                  {impactLabels[impact]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm">{t('status')}</Label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'open', color: 'bg-gray-600 hover:bg-gray-700' },
                { value: 'fixed', color: 'bg-green-600 hover:bg-green-700' },
                { value: 'ignored', color: 'bg-slate-500 hover:bg-slate-600' },
                { value: 'false_positive', color: 'bg-purple-600 hover:bg-purple-700' },
              ] as const).map(({ value, color }) => (
                <Badge
                  key={value}
                  variant={selectedStatuses.includes(value) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    selectedStatuses.includes(value) ? color : ''
                  }`}
                  onClick={() => toggleStatus(value)}
                >
                  {statusLabels[value]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Ordenação */}
          <div className="space-y-2">
            <Label className="text-sm">{t('sortBy')}</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">{t('sortPriority')}</SelectItem>
                <SelectItem value="impact">{t('sortSeverity')}</SelectItem>
                <SelectItem value="occurrences">{t('sortOccurrences')}</SelectItem>
                <SelectItem value="pages">{t('sortPages')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botão Mais Filtros */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showAdvancedFilters ? t('lessFilters') : t('moreFilters')}
        </button>

        {/* Filtros Avançados - Colapsável */}
        {showAdvancedFilters && (
          <div className="border-t pt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* WCAG Level Filter */}
              <div className="space-y-2">
                <Label className="text-sm">{t('wcagLevel')}</Label>
                <div className="flex flex-wrap gap-2">
                  {['A', 'AA', 'AAA'].map((level) => (
                    <Badge
                      key={level}
                      variant={selectedLevels.includes(level) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleLevel(level)}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* ABNT Filter */}
              {includeAbnt && uniqueAbntSections.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">{t('abntSection')}</Label>
                  <Select
                    value={selectedAbnt || 'all'}
                    onValueChange={(v) => setSelectedAbnt(v === 'all' ? '' : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('allSections')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allSections')}</SelectItem>
                      {uniqueAbntSections.map((section) => (
                        <SelectItem key={section} value={section}>
                          {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* eMAG Filter */}
              {includeEmag && uniqueEmagSections.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">{t('emagRecommendation')}</Label>
                  <Select
                    value={selectedEmag || 'all'}
                    onValueChange={(v) => setSelectedEmag(v === 'all' ? '' : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('allRecommendations')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allRecommendations')}</SelectItem>
                      {uniqueEmagSections.map((rec) => (
                        <SelectItem key={rec} value={rec}>
                          eMAG {rec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Rule Filter */}
              <div className="space-y-2">
                <Label className="text-sm">{t('specificRule')}</Label>
                <Select
                  value={selectedRule || 'all'}
                  onValueChange={(v) => setSelectedRule(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('allRules')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allRules')}</SelectItem>
                    {uniqueRules.map(([ruleId, label]) => (
                      <SelectItem key={ruleId} value={ruleId}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rule Type Filter */}
            <div className="space-y-2">
              <Label className="text-sm">{t('ruleType')}</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="custom-only"
                    checked={showCustomOnly}
                    onCheckedChange={(checked) => {
                      setShowCustomOnly(checked === true)
                      if (checked) setShowAxeOnly(false)
                    }}
                  />
                  <Label htmlFor="custom-only" className="text-sm font-normal cursor-pointer">
                    {t('onlyBr')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="axe-only"
                    checked={showAxeOnly}
                    onCheckedChange={(checked) => {
                      setShowAxeOnly(checked === true)
                      if (checked) setShowCustomOnly(false)
                    }}
                  />
                  <Label htmlFor="axe-only" className="text-sm font-normal cursor-pointer">
                    {t('onlyAxeCore')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="coga-only"
                    checked={showCogaOnly}
                    onCheckedChange={(checked) => {
                      setShowCogaOnly(checked === true)
                    }}
                  />
                  <Label htmlFor="coga-only" className="text-sm font-normal cursor-pointer">
                    {t('onlyCoga')}
                  </Label>
                </div>
              </div>
            </div>

            {/* Confidence Filter */}
            <div className="space-y-2">
              <Label className="text-sm">{t('confidenceLevel')}</Label>
              <div className="flex flex-wrap gap-4">
                <Select value={confidenceFilter} onValueChange={(v) => setConfidenceFilter(v as ConfidenceLevel | 'all')}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t('allConfidenceLevels')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allConfidenceLevels')}</SelectItem>
                    <SelectItem value="certain">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {t('confidenceCertain')}
                      </div>
                    </SelectItem>
                    <SelectItem value="likely">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        {t('confidenceLikely')}
                      </div>
                    </SelectItem>
                    <SelectItem value="needs_review">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-orange-500" />
                        {t('confidenceNeedsReview')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-experimental"
                    checked={showExperimental}
                    onCheckedChange={(checked) => setShowExperimental(!!checked)}
                  />
                  <Label htmlFor="show-experimental" className="text-sm font-normal cursor-pointer flex items-center gap-1">
                    <FlaskConical className="h-4 w-4" />
                    {t('showExperimental')}
                  </Label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chips de filtros ativos */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('filtersLabel')}:</span>
          {activeFilterChips.map((chip, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors gap-1 pr-1"
              onClick={chip.onRemove}
            >
              {chip.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground ml-2"
          >
            {t('clearAll')}
          </button>
        </div>
      )}

      {/* Selector Mode Toggle & Results count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('showing', { filtered: filteredViolations.length, total: violations.length })}
          {hasActiveFilters && ` (${t('filtered')})`}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{t('selector')}:</Label>
          <div className="flex rounded-md border overflow-hidden">
            <button
              onClick={() => setSelectorMode('selector')}
              className={`px-3 py-1 text-xs transition-colors ${
                selectorMode === 'selector'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              CSS
            </button>
            <button
              onClick={() => setSelectorMode('xpath')}
              className={`px-3 py-1 text-xs transition-colors ${
                selectorMode === 'xpath'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              XPath
            </button>
          </div>
        </div>
      </div>

      {/* Violations List */}
      {filteredViolations.length > 0 ? (
        <div className="space-y-4">
          {filteredViolations.map((v) => (
            <ViolationCard
              key={v.id}
              violation={v}
              selectorMode={selectorMode}
              t={t}
              impactLabels={impactLabels}
              override={findOverrideForViolation(v, overrides)}
              projectId={projectId}
              translateMessage={translateMessage}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          {hasActiveFilters
            ? t('noViolationsFiltered')
            : t('noViolationsFound')}
        </p>
      )}
    </div>
  )
}

function ViolationCard({ violation, selectorMode, t, impactLabels, override, projectId, translateMessage }: {
  violation: AggregatedViolation;
  selectorMode: SelectorMode;
  t: (key: string, params?: Record<string, string | number | Date>) => string;
  impactLabels: Record<ImpactLevel, string>;
  override: ViolationOverride | null;
  projectId: string;
  translateMessage: (message: string) => string;
}) {
  const [expanded, setExpanded] = useState(false)
  const isCogaRule = COGA_RULES.includes(violation.rule_id)
  const ruleLabel = getRuleLabel(violation.rule_id)
  const firstElement = violation.unique_elements?.[0]

  // Severity colors
  const severityConfig = {
    critical: { bar: 'bg-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20', hover: 'hover:border-red-200 dark:hover:border-red-900/50' },
    serious: { bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-500/20', hover: 'hover:border-orange-200 dark:hover:border-orange-900/50' },
    moderate: { bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20', hover: 'hover:border-yellow-200 dark:hover:border-yellow-900/50' },
    minor: { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20', hover: 'hover:border-blue-200 dark:hover:border-blue-900/50' },
  }
  const severity = severityConfig[violation.impact] || severityConfig.minor

  // Status badge
  const getStatusBadge = () => {
    if (!override) {
      return { label: t('statusOpen'), icon: null, dotColor: 'bg-yellow-500', isResolved: false }
    }
    switch (override.override_type) {
      case 'fixed':
        return { label: t('statusResolved'), icon: <Check className="h-3.5 w-3.5" />, dotColor: null, isResolved: true }
      case 'false_positive':
        return { label: t('overrideFalsePositive'), icon: null, dotColor: 'bg-purple-500', isResolved: false }
      case 'ignored':
        return { label: t('overrideIgnored'), icon: null, dotColor: 'bg-slate-500', isResolved: false }
      default:
        return { label: t('statusOpen'), icon: null, dotColor: 'bg-yellow-500', isResolved: false }
    }
  }
  const statusBadge = getStatusBadge()

  // Conformance badges with specific colors per type
  const conformanceBadges: { label: string; className: string }[] = []
  if (violation.wcag_level && violation.wcag_criteria?.[0]) {
    conformanceBadges.push({
      label: `WCAG ${violation.wcag_criteria[0]}`,
      className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    })
  }
  if (violation.emag_recommendations?.length) {
    conformanceBadges.push({
      label: `eMAG ${violation.emag_recommendations[0]}`,
      className: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    })
  }
  if (violation.abnt_section) {
    conformanceBadges.push({
      label: 'ABNT NBR 17060',
      className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    })
  }
  if (violation.is_custom_rule) {
    conformanceBadges.push({
      label: 'BR',
      className: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-600'
    })
  }
  if (isCogaRule) {
    conformanceBadges.push({
      label: 'COGA',
      className: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-600'
    })
  }

  // Confidence level display
  const confidenceConfig: Record<string, { label: string; color: string }> = {
    certain: { label: t('confidenceCertain'), color: 'bg-green-500' },
    likely: { label: t('confidenceLikely'), color: 'bg-yellow-500' },
    needs_review: { label: t('confidenceNeedsReview'), color: 'bg-orange-500' },
  }
  const confidence = confidenceConfig[violation.confidence_level || 'certain'] || confidenceConfig.certain

  return (
    <div className={`group relative flex flex-col rounded-xl bg-card shadow-sm border overflow-hidden transition-all duration-200 hover:shadow-md ${severity.hover}`}>
      {/* Left color bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[5px] ${severity.bar}`} />

      {/* Header */}
      <div className="p-5 pl-7 flex flex-col md:flex-row gap-6">
        {/* Left: Content */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Severity + Title + Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide ${severity.badge}`}>
              {impactLabels[violation.impact]}
            </span>
            <h3 className="text-lg font-bold leading-tight">{ruleLabel}</h3>
            {statusBadge.isResolved ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-700/50">
                {statusBadge.icon}
                {statusBadge.label}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor}`} />
                {statusBadge.label}
              </span>
            )}
            {/* Alert: marked as fixed but still detected */}
            {override?.override_type === 'fixed' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50">
                <AlertTriangle className="h-3 w-3" />
                {t('overrideStillDetected')}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {translateMessage(violation.description)}
          </p>

          {/* Quick stats */}
          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground mt-1">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              {violation.occurrences} {t('occurrencesLabel')}
            </div>
            <div className="flex items-center gap-1.5">
              <LinkIcon className="h-4 w-4" />
              {violation.page_count} {t('pagesAffectedLabel')}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex md:flex-col items-center md:items-end justify-start gap-3 md:min-w-[140px]">
          <ClassifyModal
            violation={violation}
            projectId={projectId}
            existingOverride={override}
          />
          <HelpModal violation={violation} />
        </div>
      </div>

      {/* Expandable section */}
      <div className="border-t">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex cursor-pointer items-center justify-between px-5 pl-7 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors select-none"
        >
          <div className="flex items-center gap-2">
            <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {t('viewTechnicalDetails')}
          </div>
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="px-5 pl-7 pb-6 pt-4 bg-muted/30">
            {/* Grid: Confidence, Priority, Conformance */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4 mb-6">
              {/* Confidence Level */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('confidenceLevel')}</span>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${confidence.color} opacity-75`} />
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${confidence.color}`} />
                  </span>
                  <span className="text-sm font-semibold">{confidence.label}</span>
                </div>
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('priority')}</span>
                <div className="flex items-end gap-1">
                  <span className="text-xl font-bold leading-none">{Math.min(violation.priority, 10)}</span>
                  <span className="text-sm font-medium text-muted-foreground mb-0.5">/10</span>
                </div>
              </div>

              {/* Conformance & Classification */}
              <div className="lg:col-span-2 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('conformanceAndClassification')}</span>
                <div className="flex flex-wrap gap-2">
                  {conformanceBadges.map((badge, i) => (
                    <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badge.className}`}>
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="w-full h-px bg-border mb-6" />

            {/* Main content: Code + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Code Preview - 2 columns */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    {t('affectedElements')}
                  </h4>
                  <SuggestButton violation={violation} />
                </div>

                {firstElement && (
                  <div className="space-y-3">
                    {/* Selector */}
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {selectorMode === 'xpath' ? 'XPATH' : t('cssSelector')}
                      </span>
                      <code className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded border truncate w-full">
                        {selectorMode === 'xpath' ? (firstElement.xpath || firstElement.selector) : (firstElement.fullPath || firstElement.selector)}
                      </code>
                    </div>

                    {/* Code block with line numbers */}
                    <div className="rounded-lg border overflow-hidden bg-background shadow-sm">
                      <div className="flex border-b bg-muted/50 px-3 py-1.5 justify-between items-center">
                        <span className="text-xs text-muted-foreground font-medium">{t('codeSnippet')}</span>
                        <CopyButton text={firstElement.html} />
                      </div>
                      <div className="flex overflow-x-auto p-4 font-mono text-sm leading-relaxed">
                        <div className="flex flex-col text-muted-foreground/50 text-right select-none pr-4 border-r mr-4">
                          <span>1</span>
                        </div>
                        <div className="text-muted-foreground">
                          <div className="relative py-0.5">
                            <div className="absolute -left-4 -right-4 top-0 bottom-0 bg-red-50 dark:bg-red-900/10 -z-10 border-l-2 border-red-500" />
                            <span className="text-red-700 dark:text-red-300 font-semibold">{firstElement.html}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Show more elements */}
                    {violation.unique_elements && violation.unique_elements.length > 1 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">
                          {t('viewMoreElements', { count: violation.unique_elements.length - 1 })}
                        </summary>
                        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                          {violation.unique_elements.slice(1).map((elem, idx) => (
                            <div key={idx} className="bg-muted/50 rounded p-2 border">
                              <code className="text-[10px] break-all font-mono">{elem.html}</code>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {/* Fallback for old violations */}
                {!firstElement && violation.sample_html && (
                  <div className="rounded-lg border overflow-hidden bg-background">
                    <div className="flex border-b bg-muted/50 px-3 py-1.5">
                      <span className="text-xs text-muted-foreground font-medium">{t('codeSnippet')}</span>
                    </div>
                    <pre className="p-4 text-sm overflow-x-auto font-mono">
                      <code>{violation.sample_html}</code>
                    </pre>
                  </div>
                )}
              </div>

              {/* Sidebar - 1 column */}
              <div className="flex flex-col gap-6 pl-0 lg:pl-4 lg:border-l">
                {/* Affected Pages */}
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    {t('pagesAffectedTitle')}
                  </h4>
                  <ul className="flex flex-col gap-2.5">
                    {violation.affected_pages?.slice(0, 5).map((url, i) => (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline transition-colors group/link"
                        >
                          <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground group-hover/link:text-primary" />
                          <span className="truncate">{new URL(url).pathname || '/'}</span>
                        </a>
                      </li>
                    ))}
                    {(violation.affected_pages?.length || 0) > 5 && (
                      <li className="text-xs text-muted-foreground pl-6">
                        {t('andMore', { count: (violation.affected_pages?.length || 0) - 5 })}
                      </li>
                    )}
                  </ul>
                </div>

                {/* Rule Slug */}
                <div>
                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    {t('ruleSlug')}
                  </h4>
                  <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1.5 rounded border select-all">
                    {violation.rule_id}
                  </code>
                </div>

                {/* Verify Button */}
                <VerifyButton violation={violation} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button onClick={handleCopy} className="hover:text-white transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

