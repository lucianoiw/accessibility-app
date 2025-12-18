"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AggregatedViolation } from "@/types";
import { SparklesIcon } from "lucide-react";

interface Props {
  violation: AggregatedViolation;
}

export function SuggestButton({ violation }: Props) {
  const t = useTranslations('SuggestButton');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(
    violation.ai_suggestion
  );
  const [suggestedHtml, setSuggestedHtml] = useState<string | null>(
    violation.ai_suggested_html
  );
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/violations/${violation.id}/suggest`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('generateError'));
      }

      const data = await response.json();
      setSuggestion(data.suggestion);
      setSuggestedHtml(data.suggested_html);
      setIsOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('generateError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Se já tem sugestão, mostrar direto
  if (suggestion) {
    return (
      <details className="mt-3" open={isOpen}>
        <summary
          className="text-xs cursor-pointer text-purple-600 dark:text-purple-400 hover:underline font-medium"
          onClick={() => setIsOpen(!isOpen)}
        >
          {t('viewSuggestion')}
        </summary>
        <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-sm">
          <p className="text-foreground/90">{suggestion}</p>
          {suggestedHtml && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {t('suggestedCode')}
              </p>
              <div className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                <code>{suggestedHtml}</code>
              </div>
            </div>
          )}
        </div>
      </details>
    );
  }

  return (
    <div className="mt-3">
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <Button
        size="sm"
        onClick={handleGenerate}
        disabled={isLoading}
        className="bg-purple-100 text-purple-600 hover:text-white hover:bg-purple-600"
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-1">&#9696;</span>
            {t('generating')}
          </>
        ) : (
          <>
            <SparklesIcon className="size-4" />
            {t('generateSuggestion')}
          </>
        )}
      </Button>
    </div>
  );
}
