"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  AnalysisProgress,
} from "@/components/ui";
import type { Clarification } from "@/types";

interface ClarificationFormProps {
  caseId: string;
  clarifications: Clarification[];
  faktumText: string;
  escalationWarning?: string | null;
}

export function ClarificationForm({
  caseId,
  clarifications,
  faktumText,
  escalationWarning,
}: ClarificationFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    clarifications.forEach((c) => {
      initial[c.id] = c.user_answer || "";
    });
    return initial;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnswerChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Save all answers
      const response = await fetch(`/api/cases/${caseId}/clarifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Kunne ikke lagre svar");
      }

      // Start analysis
      const analyzeResponse = await fetch(`/api/cases/${caseId}/analyze`, {
        method: "POST",
      });

      if (!analyzeResponse.ok) {
        const data = await analyzeResponse.json();
        throw new Error(data.error || "Kunne ikke starte analyse");
      }

      router.push(`/results/${caseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "En feil oppsto");
      setLoading(false);
    }
  };

  const answeredCount = Object.values(answers).filter(
    (a) => a.trim().length > 0,
  ).length;

  return (
    <>
      {/* Analysis Progress Overlay */}
      <AnalysisProgress isActive={loading} />
      
      <div className="space-y-6">
        {/* Summary of faktum */}
      <Card variant="bordered">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            Din situasjon
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 whitespace-pre-wrap">{faktumText}</p>
        </CardContent>
      </Card>

      {/* Escalation warning if needed */}
      {escalationWarning && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
          <div className="flex gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">
                Viktig melding
              </h3>
              <div className="text-amber-800 text-sm whitespace-pre-wrap">
                {escalationWarning}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clarification questions */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Oppklarende spørsmål
              </h1>
              <p className="text-slate-600 mt-1">
                Svar på spørsmålene under for en mer presis analyse
              </p>
            </div>
            <div className="text-sm text-slate-500">
              {answeredCount} av {clarifications.length} besvart
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {clarifications.map((clarification, index) => (
              <div key={clarification.id} className="space-y-2">
                <label className="block">
                  <span className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-slate-900 font-medium pt-0.5">
                      {clarification.question}
                    </span>
                  </span>
                </label>
                <Textarea
                  value={answers[clarification.id] || ""}
                  onChange={(e) =>
                    handleAnswerChange(clarification.id, e.target.value)
                  }
                  placeholder="Skriv ditt svar her..."
                  className="ml-9 min-h-[100px]"
                />
              </div>
            ))}

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 ml-9">
              <p className="text-sm text-slate-600">
                💡 <strong>Tips:</strong> Jo mer detaljerte svar du gir, desto
                bedre og mer presis analyse kan vi gi deg. Du kan hoppe over
                spørsmål du ikke kan svare på.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={loading}
            >
              ← Tilbake
            </Button>
            <Button type="submit" size="lg" isLoading={loading}>
              {loading ? "Analyserer..." : "Start analyse"}
            </Button>
          </CardFooter>
        </form>
      </Card>
      </div>
    </>
  );
}
