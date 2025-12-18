"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
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
import { ScoreModal } from "./score-modal";
import type { ScoreData } from "@/lib/audit/score-calculator";

interface ScoreCardProps {
  scoreData: ScoreData;
  className?: string;
}

export function ScoreCard({ scoreData, className }: ScoreCardProps) {
  const t = useTranslations("AuditComponents");
  const tSeverity = useTranslations("Severity");
  const [showModal, setShowModal] = useState(false);
  const { score, passedRules, failedRules, scoreImpact } = scoreData;

  const getScoreColor = (s: number) => {
    if (s >= 90) return "text-green-500";
    if (s >= 70) return "text-blue-500";
    if (s >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getGaugeColor = (s: number) => {
    if (s >= 90) return "stroke-green-500";
    if (s >= 70) return "stroke-blue-500";
    if (s >= 50) return "stroke-yellow-500";
    return "stroke-red-500";
  };

  const severities = useMemo(() => [
    {
      key: "critical",
      label: tSeverity("critical"),
      passed: passedRules.critical,
      failed: failedRules.critical,
      impact: scoreImpact.critical,
    },
    {
      key: "serious",
      label: tSeverity("serious"),
      passed: passedRules.serious,
      failed: failedRules.serious,
      impact: scoreImpact.serious,
    },
    {
      key: "moderate",
      label: tSeverity("moderate"),
      passed: passedRules.moderate,
      failed: failedRules.moderate,
      impact: scoreImpact.moderate,
    },
    {
      key: "minor",
      label: tSeverity("minor"),
      passed: passedRules.minor,
      failed: failedRules.minor,
      impact: scoreImpact.minor,
    },
  ], [tSeverity, passedRules, failedRules, scoreImpact]);

  return (
    <>
      <Card className={cn("", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{t("accessibilityScore")}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t("scoreTooltip")}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-sm">{t("scoreTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <CardDescription>{t("scoreDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Gauge */}
            <div className="shrink-0">
              <ScoreGauge score={score} scoreLabel={t("score")} />
            </div>

            {/* Tabela */}
            <div className="flex-1 w-full">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="text-left pb-2 font-medium">
                      <div className="flex items-center gap-1">
                        {t("ruleSeverity")}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("ruleSeverityTooltip")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                    <th className="text-center pb-2 font-medium">
                      {t("passedRules")}
                    </th>
                    <th className="text-center pb-2 font-medium">
                      {t("failedRules")}
                    </th>
                    <th className="text-right pb-2 font-medium">
                      {t("scoreImpact")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {severities.map((sev) => (
                    <tr key={sev.key} className="border-t border-border/50">
                      <td className="py-2 font-medium">{sev.label}</td>
                      <td className="py-2 text-center text-muted-foreground">
                        {sev.passed}
                      </td>
                      <td className="py-2 text-center text-muted-foreground">
                        {sev.failed}
                      </td>
                      <td
                        className={cn(
                          "py-2 text-right font-medium",
                          sev.impact < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                        )}
                      >
                        {sev.impact !== 0 ? sev.impact : "0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Link para modal */}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-4 text-sm text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1"
          >
            {t("viewScoreCalculation")}
            <span aria-hidden="true">→</span>
          </button>
        </CardContent>
      </Card>

      <ScoreModal
        open={showModal}
        onOpenChange={setShowModal}
        scoreData={scoreData}
      />
    </>
  );
}

// ============================================
// Componente: Score Gauge
// ============================================

function ScoreGauge({ score, scoreLabel }: { score: number; scoreLabel: string }) {
  const getGaugeColor = (s: number) => {
    if (s >= 90) return "stroke-green-500";
    if (s >= 70) return "stroke-blue-500";
    if (s >= 50) return "stroke-yellow-500";
    return "stroke-red-500";
  };

  // Semi-circle gauge (180 degrees)
  const radius = 60;
  const circumference = Math.PI * radius; // Half circle
  const progress = (score / 100) * circumference;

  return (
    <div
      className="relative w-40 h-24"
      role="img"
      aria-label={`${scoreLabel}: ${score}`}
    >
      <svg viewBox="0 0 140 90" className="w-full h-full" aria-hidden="true">
        {/* Background arc */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-gray-200 dark:text-gray-700"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          strokeWidth="12"
          className={getGaugeColor(score)}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{
            transition: "stroke-dasharray 0.5s ease-in-out",
          }}
        />
        {/* Min label */}
        <text
          x="10"
          y="88"
          className="text-[9px] font-bold fill-gray-300 dark:fill-gray-600"
          textAnchor="middle"
        >
          0
        </text>
        {/* Max label */}
        <text
          x="130"
          y="88"
          className="text-[9px] font-bold fill-gray-300 dark:fill-gray-600"
          textAnchor="middle"
        >
          100
        </text>
      </svg>
      {/* Score number */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span
          className={cn(
            "text-4xl font-bold",
            getGaugeColor(score).replace("stroke-", "text-")
          )}
        >
          {score}
        </span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {scoreLabel}
        </span>
      </div>
    </div>
  );
}
