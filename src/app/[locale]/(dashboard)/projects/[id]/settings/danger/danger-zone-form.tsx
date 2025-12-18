"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { Project } from "@/types";
import { deleteProject } from "../actions";

interface Props {
  project: Project;
  auditCount: number;
}

export function DangerZoneForm({ project, auditCount }: Props) {
  const t = useTranslations("DangerZone");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const confirmWord = t("confirmWord");
  const canDelete = confirmText.toLowerCase() === confirmWord.toLowerCase();

  async function handleDelete() {
    if (!canDelete) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteProject(project.id);
      } catch (err) {
        setError(t("deleteError"));
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-950">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-red-700 dark:text-red-400">
                {t("title")}
              </CardTitle>
              <CardDescription>
                {t("description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900">
            <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">
              {t("deleteProjectName", { name: project.name })}
            </h4>
            <p className="text-sm text-red-700 dark:text-red-400 mb-3">
              {t("deleteWarning")}
            </p>
            <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 ml-4 list-disc">
              <li>
                {auditCount !== 1
                  ? t("allAudits", { count: auditCount })
                  : t("allAuditsSingular", { count: auditCount })}
              </li>
              <li>{t("allViolationsHistory")}</li>
              <li>{t("allAuthConfigs")}</li>
              <li>{t("allReports")}</li>
            </ul>
          </div>

          {/* Project info */}
          <div className="p-4 rounded-lg bg-muted/50">
            <h5 className="text-sm font-medium mb-2">{t("projectDetails")}</h5>
            <dl className="text-sm space-y-1">
              <div className="flex items-center gap-1.5">
                <dt className="text-muted-foreground">{t("projectName")}:</dt>
                <dd className="font-medium">{project.name}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-muted-foreground">{t("projectUrl")}:</dt>
                <dd className="font-medium truncate">{project.base_url}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-muted-foreground">{t("createdAt")}:</dt>
                <dd className="font-medium">
                  {new Date(project.created_at).toLocaleDateString(locale, {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-muted-foreground">{t("audits")}:</dt>
                <dd className="font-medium">{auditCount}</dd>
              </div>
            </dl>
          </div>

          {/* Confirmation */}
          <div className="space-y-3">
            <Label htmlFor="confirm">
              {t("confirmLabel")}{" "}
              <span className="font-bold text-red-600 dark:text-red-400">
                {confirmWord}
              </span>
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t("confirmPlaceholder")}
              className="max-w-xs"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-red-200 dark:border-red-900">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canDelete || isPending}
              className="w-full sm:w-auto"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("deleteButton")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
