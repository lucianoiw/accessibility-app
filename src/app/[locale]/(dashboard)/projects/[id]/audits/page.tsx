"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Audit, DiscoveryMethod } from "@/types";
import { StartAuditButton } from "../start-audit-button";
import { cn } from "@/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  CalendarClock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteAuditButton } from "@/components/audit";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

interface Project {
  id: string;
  name: string;
  url: string;
  discovery_method: DiscoveryMethod;
  discovery_config: any;
  default_wcag_levels: string[];
  default_max_pages: number;
  default_include_abnt: boolean;
  default_include_emag: boolean;
  default_include_coga: boolean;
}

export default function ProjectAuditsPage({ params }: Props) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [locale, setLocale] = useState<string>("pt-BR");
  const [project, setProject] = useState<Project | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  const t = useTranslations("Audit");
  const tSeverity = useTranslations("Severity");
  const tStatus = useTranslations("AuditStatus");
  const tComparison = useTranslations("AuditComparison");
  const tSchedule = useTranslations("ScheduleSettings");

  useEffect(() => {
    params.then(({ id, locale: loc }) => {
      setProjectId(id);
      setLocale(loc);
    });
  }, [params]);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch project
        const projectRes = await fetch(`/api/projects/${projectId}`);
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          setProject(projectData);
        }

        // Fetch audits
        const auditsRes = await fetch(`/api/projects/${projectId}/audits`);
        if (auditsRes.ok) {
          const auditsData = await auditsRes.json();
          setAudits(auditsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calcular deltas entre auditorias consecutivas
  const auditsWithDelta = audits.map((audit, index) => {
    const previousAudit = audits[index + 1]; // próximo no array é o anterior cronologicamente
    let delta = null;

    if (
      previousAudit &&
      audit.status === "COMPLETED" &&
      previousAudit.status === "COMPLETED"
    ) {
      delta = {
        healthScore:
          (audit.health_score ?? 0) - (previousAudit.health_score ?? 0),
        total:
          (audit.summary?.total ?? 0) - (previousAudit.summary?.total ?? 0),
        critical:
          (audit.summary?.critical ?? 0) -
          (previousAudit.summary?.critical ?? 0),
        serious:
          (audit.summary?.serious ?? 0) - (previousAudit.summary?.serious ?? 0),
      };
    }

    return { ...audit, delta, previousAudit };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("audits")}</h2>
          <p className="text-muted-foreground">{project.name}</p>
        </div>
        <StartAuditButton
          projectId={project.id}
          discoveryMethod={project.discovery_method}
          discoveryConfig={project.discovery_config}
          defaults={{
            wcagLevels: project.default_wcag_levels,
            maxPages: project.default_max_pages,
            includeAbnt: project.default_include_abnt,
            includeEmag: project.default_include_emag,
            includeCoga: project.default_include_coga,
          }}
        />
      </div>

      {/* Lista de Auditorias */}
      {auditsWithDelta.length > 0 ? (
        <div className="space-y-4">
          {auditsWithDelta.map((audit, index) => (
            <AuditCard
              key={audit.id}
              audit={audit}
              delta={audit.delta}
              locale={locale}
              projectId={project.id}
              isLatest={index === 0}
              t={t}
              tSeverity={tSeverity}
              tStatus={tStatus}
              tComparison={tComparison}
              tSchedule={tSchedule}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{t("noAudits")}</p>
            <StartAuditButton
              projectId={project.id}
              discoveryMethod={project.discovery_method}
              discoveryConfig={project.discovery_config}
              defaults={{
                wcagLevels: project.default_wcag_levels,
                maxPages: project.default_max_pages,
                includeAbnt: project.default_include_abnt,
                includeEmag: project.default_include_emag,
                includeCoga: project.default_include_coga,
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Componente AuditCard
// ============================================

interface AuditCardProps {
  audit: Audit;
  delta: {
    healthScore: number;
    total: number;
    critical: number;
    serious: number;
  } | null;
  locale: string;
  projectId: string;
  isLatest: boolean;
  t: ReturnType<typeof useTranslations<"Audit">>;
  tSeverity: ReturnType<typeof useTranslations<"Severity">>;
  tStatus: ReturnType<typeof useTranslations<"AuditStatus">>;
  tComparison: ReturnType<typeof useTranslations<"AuditComparison">>;
  tSchedule: ReturnType<typeof useTranslations<"ScheduleSettings">>;
}

function AuditCard({
  audit,
  delta,
  locale,
  projectId,
  isLatest,
  t,
  tSeverity,
  tStatus,
  tComparison,
  tSchedule,
}: AuditCardProps) {
  const isCompleted = audit.status === "COMPLETED";
  const isInProgress = [
    "PENDING",
    "CRAWLING",
    "AUDITING",
    "AGGREGATING",
    "GENERATING",
  ].includes(audit.status);
  const healthScore = audit.health_score ?? 0;

  // Cores do health score
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-blue-600 dark:text-blue-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-50 dark:bg-green-950/50";
    if (score >= 70) return "bg-blue-50 dark:bg-blue-950/50";
    if (score >= 50) return "bg-yellow-50 dark:bg-yellow-950/50";
    return "bg-red-50 dark:bg-red-950/50";
  };

  return (
    <Link href={`/projects/${projectId}/audits/${audit.id}`} className="block">
      <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden p-0">
        <CardContent className="p-0">
          <div className="flex">
            {/* Coluna 1: Score */}
            {isCompleted ? (
              <div
                className={cn(
                  "w-24 shrink-0 flex flex-col items-center justify-center py-4 px-3",
                  getScoreBg(healthScore)
                )}
              >
                <span
                  className={cn(
                    "text-2xl font-bold",
                    getScoreColor(healthScore)
                  )}
                >
                  {healthScore}%
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Score
                </span>
                {delta && delta.healthScore !== 0 && (
                  <div
                    className={cn(
                      "flex items-center gap-0.5 mt-1 text-xs font-medium",
                      delta.healthScore > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {delta.healthScore > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>
                      {delta.healthScore > 0 ? "+" : ""}
                      {delta.healthScore}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-24 shrink-0 flex flex-col items-center justify-center py-4 px-3 bg-muted/30">
                <StatusIcon status={audit.status} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">
                  {tStatus(getStatusKey(audit.status))}
                </span>
              </div>
            )}

            {/* Coluna 2: Conteúdo principal */}
            <div className="flex-1 py-3 px-4 min-w-0">
              {/* Linha 1: Data + Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {new Date(audit.created_at).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>

                {isLatest && (
                  <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                    {t("latest")}
                  </span>
                )}

                <AuditStatusBadge status={audit.status} tStatus={tStatus} />

                {audit.is_scheduled && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium">
                        <CalendarClock className="h-3 w-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {tSchedule("scheduledAuditTooltip")}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Linha 2: Violações */}
              {isCompleted && audit.summary && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">
                      {audit.summary.total}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t("violations")}
                    </span>
                    {audit.summary.patterns && (
                      <span className="text-xs text-muted-foreground">
                        ({audit.summary.patterns.total} {t("patterns")})
                      </span>
                    )}
                  </div>

                  {delta && delta.total !== 0 && (
                    <DeltaBadge value={delta.total} type="violations" />
                  )}

                  {/* Severidades inline */}
                  <div className="flex items-center gap-1.5">
                    {audit.summary.critical > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {audit.summary.critical}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {audit.summary.critical} {tSeverity("critical")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {audit.summary.serious > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {audit.summary.serious}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {audit.summary.serious} {tSeverity("serious")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {audit.summary.moderate > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {audit.summary.moderate}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {audit.summary.moderate} {tSeverity("moderate")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {audit.summary.minor > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {audit.summary.minor}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {audit.summary.minor} {tSeverity("minor")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}

              {/* Linha 3: Meta info */}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {audit.processed_pages} {t("pages")}
                </span>
                <span className="text-muted-foreground/50">•</span>
                <span>WCAG {audit.wcag_levels.join("/")}</span>
                {audit.include_emag && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      eMAG
                    </span>
                  </>
                )}
                {audit.include_abnt && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ABNT
                    </span>
                  </>
                )}
                {audit.include_coga && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-purple-600 dark:text-purple-400 font-medium">
                      COGA
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="py-3 px-4">
              {/* Botão de excluir */}
              {!isInProgress && (
                <DeleteAuditButton
                  auditId={audit.id}
                  projectId={projectId}
                  variant="icon"
                  onDeleted={() => window.location.reload()}
                />
              )}
            </div>

            {/* Coluna 3: Indicador de comparação + Ações */}
            {/* Indicador de tendência */}
            {delta && isCompleted && (
              <div
                className={cn(
                  "shrink-0 flex flex-col items-center justify-center w-[120] py-3 px-4 border-l border-border/50"
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center">
                      {delta.total < 0 ? (
                        <div className="flex flex-col items-center text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-6 w-6" />
                          <span className="text-xs mt-1 font-medium whitespace-nowrap">
                            {Math.abs(delta.total)} {tComparison("fixed")}
                          </span>
                        </div>
                      ) : delta.total > 0 ? (
                        <div className="flex flex-col items-center text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-6 w-6" />
                          <span className="text-xs mt-1 font-medium whitespace-nowrap">
                            +{delta.total} {tComparison("new")}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-muted-foreground">
                          <Minus className="h-6 w-6" />
                          <span className="text-xs mt-1">
                            {tComparison("stable")}
                          </span>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {delta.total < 0
                      ? `${Math.abs(delta.total)} violações a menos`
                      : delta.total > 0
                      ? `${delta.total} violações a mais`
                      : "Mesmo número de violações"}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================
// Componentes auxiliares
// ============================================

function DeltaBadge({
  value,
  type,
}: {
  value: number;
  type: "score" | "violations";
}) {
  if (value === 0) return null;

  // Para score: positivo é bom, negativo é ruim
  // Para violations: negativo é bom (menos violações), positivo é ruim
  const isPositive = type === "score" ? value > 0 : value < 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium",
        isPositive
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      )}
    >
      {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 className="h-8 w-8 text-green-600" />;
    case "FAILED":
      return <XCircle className="h-8 w-8 text-red-600" />;
    case "CANCELLED":
      return <XCircle className="h-8 w-8 text-gray-500" />;
    case "CRAWLING":
    case "AUDITING":
    case "AGGREGATING":
    case "GENERATING":
      return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
    default:
      return <Clock className="h-8 w-8 text-gray-500" />;
  }
}

function getStatusKey(status: string): string {
  const keys: Record<string, string> = {
    PENDING: "pending",
    CRAWLING: "crawling",
    AUDITING: "auditing",
    AGGREGATING: "aggregating",
    GENERATING: "generating",
    COMPLETED: "completed",
    FAILED: "failed",
    CANCELLED: "cancelled",
  };
  return keys[status] || "pending";
}

function AuditStatusBadge({
  status,
  tStatus,
}: {
  status: string;
  tStatus: ReturnType<typeof useTranslations<"AuditStatus">>;
}) {
  const statusConfig: Record<string, { labelKey: string; className: string }> =
    {
      PENDING: {
        labelKey: "pending",
        className:
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
      CRAWLING: {
        labelKey: "crawling",
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      },
      AUDITING: {
        labelKey: "auditing",
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      },
      AGGREGATING: {
        labelKey: "aggregating",
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      },
      GENERATING: {
        labelKey: "generating",
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      },
      COMPLETED: {
        labelKey: "completed",
        className:
          "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      },
      FAILED: {
        labelKey: "failed",
        className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      },
      CANCELLED: {
        labelKey: "cancelled",
        className:
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
    };

  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}
    >
      {tStatus(config.labelKey as any)}
    </span>
  );
}
