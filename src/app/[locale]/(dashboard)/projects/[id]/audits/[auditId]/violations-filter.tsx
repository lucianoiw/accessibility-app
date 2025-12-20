'use client'

import { useState, useMemo } from 'react'
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
import type { AggregatedViolation, ImpactLevel, ViolationStatus, UniqueElement, ConfidenceLevel } from '@/types'
import { getRuleLabel } from '@/lib/audit/rule-labels'
import { VerifyButton } from './verify-button'
import { SuggestButton } from './suggest-button'
import { ConfidenceBadge } from '@/components/audit/confidence-badge'
import { Copy, Check, ChevronDown, ChevronUp, X, CheckCircle2, AlertCircle, HelpCircle, FlaskConical } from 'lucide-react'

interface Props {
  violations: AggregatedViolation[]
  includeAbnt: boolean
  includeEmag?: boolean
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

export function ViolationsFilter({ violations, includeAbnt, includeEmag }: Props) {
  const t = useTranslations('ViolationsFilter')
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

    // Status filter
    if (selectedStatuses.length > 0) {
      result = result.filter((v) => selectedStatuses.includes(v.status))
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
            <ViolationCard key={v.id} violation={v} selectorMode={selectorMode} t={t} impactLabels={impactLabels} />
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

function ViolationCard({ violation, selectorMode, t, impactLabels }: {
  violation: AggregatedViolation;
  selectorMode: SelectorMode;
  t: (key: string, params?: Record<string, string | number | Date>) => string;
  impactLabels: Record<ImpactLevel, string>;
}) {
  const isCogaRule = COGA_RULES.includes(violation.rule_id)

  const impactColors = {
    critical: 'border-l-red-500 bg-red-50 dark:bg-red-950/30',
    serious: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/30',
    moderate: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
    minor: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30',
  }

  const ruleLabel = getRuleLabel(violation.rule_id)

  return (
    <div
      className={`border-l-4 p-4 rounded-r-lg ${impactColors[violation.impact]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                violation.impact === 'critical'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  : violation.impact === 'serious'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                    : violation.impact === 'moderate'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              }`}
            >
              {impactLabels[violation.impact]}
            </span>
            {violation.wcag_level && (
              <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                WCAG {violation.wcag_level}
              </span>
            )}
            {violation.abnt_section && (
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                {violation.abnt_section}
              </span>
            )}
            {violation.emag_recommendations && violation.emag_recommendations.length > 0 && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                eMAG {violation.emag_recommendations.slice(0, 3).join(', ')}
                {violation.emag_recommendations.length > 3 && ` +${violation.emag_recommendations.length - 3}`}
              </span>
            )}
            {violation.is_custom_rule && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                BR
              </span>
            )}
            {isCogaRule && (
              <span className="text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded">
                COGA
              </span>
            )}
            {violation.confidence_level && (
              <ConfidenceBadge
                level={violation.confidence_level}
                score={violation.confidence_score || 1}
                signals={violation.confidence_signals || []}
                isExperimental={violation.is_experimental}
              />
            )}
          </div>

          {/* Rule label as title */}
          <h4 className="font-semibold mt-2 text-base">{ruleLabel}</h4>

          {/* Help text */}
          <p className="text-sm font-medium text-foreground/80 mt-1">
            {violation.help}
          </p>

          {/* Description */}
          <p className="text-sm text-muted-foreground mt-1">
            {violation.description}
          </p>

          <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <span className="font-medium">{violation.occurrences}x</span> {t('occurrences')}
            </span>
            <span>
              <span className="font-medium">{violation.page_count}</span> {t('pages')}
            </span>
            {violation.priority > 0 && (
              <span>
                {t('priority')}: <span className="font-medium">{violation.priority}</span>
              </span>
            )}
            <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">
              {violation.rule_id}
            </span>
          </div>

          {/* Elementos afetados */}
          <details className="mt-3">
            <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
              {t('viewAffectedElements')} ({violation.unique_elements?.length || 1})
            </summary>
            <div className="mt-2 space-y-3">
              {violation.unique_elements && violation.unique_elements.length > 0 ? (
                violation.unique_elements.map((elem, idx) => (
                  <ElementCard key={idx} elem={elem} selectorMode={selectorMode} t={t} />
                ))
              ) : (
                // Fallback para violações antigas sem unique_elements
                <div className="border rounded-lg p-3 bg-background/50">
                  <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto">
                    <code>{violation.sample_html}</code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">
                      {violation.sample_selector}
                    </code>
                  </p>
                </div>
              )}
            </div>
          </details>

          {/* Páginas afetadas */}
          {violation.affected_pages && violation.affected_pages.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                {t('viewAffectedPages')} ({violation.page_count})
              </summary>
              <ul className="mt-2 text-xs space-y-1">
                {violation.affected_pages.slice(0, 10).map((url, i) => (
                  <li key={i} className="truncate">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
                {violation.affected_pages.length > 10 && (
                  <li className="text-muted-foreground">
                    {t('andMore', { count: violation.affected_pages.length - 10 })}
                  </li>
                )}
              </ul>
            </details>
          )}

          {/* Sugestão de correção */}
          <SuggestButton violation={violation} />
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          {violation.help_url && (
            <a
              href={violation.help_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline whitespace-nowrap"
            >
              {t('learnMore')} →
            </a>
          )}
          <VerifyButton violation={violation} />
        </div>
      </div>
    </div>
  )
}

function ElementCard({ elem, selectorMode, t }: {
  elem: UniqueElement;
  selectorMode: SelectorMode;
  t: (key: string, params?: Record<string, string | number | Date>) => string;
}) {
  const [copied, setCopied] = useState(false)

  // Escolhe o seletor baseado no modo
  const cssSelector = elem.fullPath || elem.selector
  const xpathSelector = elem.xpath || cssSelector // fallback para CSS se não tiver xpath
  const selector = selectorMode === 'xpath' ? xpathSelector : cssSelector

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selector)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback para browsers antigos
      const textarea = document.createElement('textarea')
      textarea.value = selector
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="border rounded-lg p-3 bg-background/50">
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleCopy}
          title={selectorMode === 'xpath' ? t('copyXPathTooltip') : t('copyCssTooltip')}
        >
          {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
          {copied ? t('copied') : selectorMode === 'xpath' ? t('copyXPath') : t('copySelector')}
        </Button>
        <span className="text-xs text-muted-foreground">
          {elem.count}x {t('in')} {elem.pages.length} {elem.pages.length === 1 ? t('page') : t('pages')}
        </span>
      </div>
      <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto">
        <code>{elem.html}</code>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px] break-all">
          {selector}
        </code>
      </p>
      {elem.pages.length <= 3 && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          {elem.pages.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline block truncate"
            >
              {url}
            </a>
          ))}
        </div>
      )}
      {copied && (
        <p className="text-xs text-green-600 mt-2">
          {selectorMode === 'xpath'
            ? t('pasteXPathHint')
            : t('pasteCssHint')}
        </p>
      )}
    </div>
  )
}
