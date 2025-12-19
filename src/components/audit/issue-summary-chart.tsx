"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@/utils";

interface PatternCounts {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  total: number;
}

interface IssueSummaryChartProps {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  patterns?: PatternCounts;
  className?: string;
}

const SEVERITY_COLORS = {
  critical: "#DC2626",
  serious: "#9333EA",
  moderate: "#F59E0B",
  minor: "#6B7280",
};

export function IssueSummaryChart({
  critical,
  serious,
  moderate,
  minor,
  patterns,
  className,
}: IssueSummaryChartProps) {
  const t = useTranslations("AuditComponents");
  const tSeverity = useTranslations("Severity");

  const total = critical + serious + moderate + minor;

  const data = useMemo(() => {
    const items = [
      {
        name: tSeverity("critical"),
        value: critical,
        color: SEVERITY_COLORS.critical,
      },
      {
        name: tSeverity("serious"),
        value: serious,
        color: SEVERITY_COLORS.serious,
      },
      {
        name: tSeverity("moderate"),
        value: moderate,
        color: SEVERITY_COLORS.moderate,
      },
      {
        name: tSeverity("minor"),
        value: minor,
        color: SEVERITY_COLORS.minor,
      },
    ].filter((item) => item.value > 0);

    // Se nao houver issues, mostrar um item vazio para manter o visual
    if (items.length === 0) {
      items.push({ name: t("noIssues"), value: 1, color: "#E5E7EB" });
    }

    return items;
  }, [t, tSeverity, critical, serious, moderate, minor]);

  const severities = useMemo(
    () => [
      {
        key: "critical",
        label: tSeverity("critical"),
        count: critical,
        patternCount: patterns?.critical ?? 0,
        color: SEVERITY_COLORS.critical,
      },
      {
        key: "serious",
        label: tSeverity("serious"),
        count: serious,
        patternCount: patterns?.serious ?? 0,
        color: SEVERITY_COLORS.serious,
      },
      {
        key: "moderate",
        label: tSeverity("moderate"),
        count: moderate,
        patternCount: patterns?.moderate ?? 0,
        color: SEVERITY_COLORS.moderate,
      },
      {
        key: "minor",
        label: tSeverity("minor"),
        count: minor,
        patternCount: patterns?.minor ?? 0,
        color: SEVERITY_COLORS.minor,
      },
    ],
    [tSeverity, critical, serious, moderate, minor, patterns]
  );

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">{t("issueSummary")}</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t("issueSummaryTooltip")}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-sm">{t("issueSummaryTooltip")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <CardDescription>{t("issueSummaryDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Donut Chart */}
          <div className="relative w-40 h-40 shrink-0">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="80%"
                  outerRadius="100%"
                  cornerRadius="50%"
                  paddingAngle={5}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{total}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {t("issues")}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left pb-2 font-medium">
                    {t("issueSeverity")}
                  </th>
                  <th className="text-right pb-2 font-medium">
                    {t("issueCount")}
                  </th>
                  {patterns && (
                    <th className="text-right pb-2 font-medium">
                      {t("issuePatterns")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {severities.map((sev) => (
                  <tr key={sev.key} className="border-t border-border/50">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: sev.color }}
                        />
                        <span>{sev.label}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-medium">{sev.count}</td>
                    {patterns && (
                      <td className="py-2 text-right text-muted-foreground">
                        {sev.patternCount}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer link */}
        {total > 0 && (
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground flex items-center justify-between">
            <span>{t("unexpectedChanges")}</span>
            <button
              type="button"
              className="text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1"
            >
              {t("understandWhy")}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
