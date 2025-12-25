"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader } from "@/components/ui";
import type {
  Result,
  Case,
  Evidence,
  QAItem,
  ChecklistItem,
  DocumentationItem,
  LegalSource,
} from "@/types";

interface ResultsDisplayProps {
  caseData: Case;
  result: Result;
  evidence: Evidence[];
}

export function ResultsDisplay({
  caseData,
  result,
  evidence,
}: ResultsDisplayProps) {
  const [expandedQA, setExpandedQA] = useState<string | null>(null);
  const [showLessRelevant, setShowLessRelevant] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    result.checklist_json,
  );

  // Split Q&A items into high relevance (7+) and lower relevance
  const { highRelevanceQA, lowRelevanceQA } = useMemo(() => {
    const sorted = [...result.qa_json].sort((a, b) => (b.relevance || 5) - (a.relevance || 5));
    return {
      highRelevanceQA: sorted.filter((qa) => (qa.relevance || 5) >= 7),
      lowRelevanceQA: sorted.filter((qa) => (qa.relevance || 5) < 7),
    };
  }, [result.qa_json]);

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  const confidenceColors = {
    høy: "bg-green-100 text-green-800",
    middels: "bg-amber-100 text-amber-800",
    lav: "bg-red-100 text-red-800",
  };

  const priorityColors = {
    høy: "border-red-300 bg-red-50",
    middels: "border-amber-300 bg-amber-50",
    lav: "border-slate-300 bg-slate-50",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Juridisk analyse
          </h1>
          <p className="text-slate-600 mt-1">
            Basert på din situasjon og {evidence.length} kilder
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/api/cases/${caseData.id}/export`}>
            <Button variant="outline">📄 Last ned PDF</Button>
          </Link>
          <Link href="/faktum">
            <Button variant="secondary">+ Ny sak</Button>
          </Link>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
        <p className="text-amber-900 text-sm">
          ⚠️ <strong>Viktig:</strong> Dette er generell juridisk informasjon,
          ikke juridisk rådgivning. For konkrete saker bør du konsultere en
          advokat. Informasjonen er basert på offentlige kilder og kan inneholde
          feil.
        </p>
      </div>

      {/* Sources Summary */}
      <Card variant="bordered">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            📚 Relevante rettskilder
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.sources_json.map((source: LegalSource, index: number) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all"
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    source.priority === 1
                      ? "bg-green-100 text-green-700"
                      : source.priority === 2
                        ? "bg-blue-100 text-blue-700"
                        : source.priority === 3
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {source.priority}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {source.name}
                  </p>
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {source.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Q&A Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            ❓ Spørsmål og svar
          </h2>
          <span className="text-sm text-slate-500">
            {highRelevanceQA.length} mest relevante av {result.qa_json.length}
          </span>
        </div>

        {/* High relevance Q&A (7+) */}
        {highRelevanceQA.map((qa: QAItem, index: number) => (
          <Card
            key={qa.id}
            variant="elevated"
            className={`cursor-pointer transition-all ${
              expandedQA === qa.id ? "ring-2 ring-amber-300" : ""
            }`}
          >
            <div
              onClick={() => setExpandedQA(expandedQA === qa.id ? null : qa.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <h3 className="font-semibold text-slate-900 pt-1">
                      {qa.question}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {qa.relevance || 5}/10
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${confidenceColors[qa.confidence]}`}
                    >
                      {qa.confidence}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </div>

            <CardContent className="pt-0">
              <div className="ml-11 space-y-4">
                <p className="text-slate-700 leading-relaxed">{qa.answer}</p>

                {/* Citations - Always visible at bottom */}
                {qa.citations.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                      {qa.citations.map((citation, cidx) => (
                        <a
                          key={cidx}
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-800 transition-colors"
                        >
                          <span>📎</span>
                          <span>
                            {citation.source_name}
                            {citation.section && ` ${citation.section}`}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expandable section for assumptions and missing facts */}
                {(qa.assumptions.length > 0 || qa.missing_facts.length > 0) && (
                  <>
                    {expandedQA === qa.id && (
                      <div className="space-y-4 pt-3 border-t border-slate-100">
                        {/* Assumptions */}
                        {qa.assumptions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-900 mb-2">
                              💭 Forutsetninger
                            </h4>
                            <ul className="text-sm text-slate-600 space-y-1">
                              {qa.assumptions.map((assumption, aidx) => (
                                <li key={aidx} className="flex items-start gap-2">
                                  <span className="text-slate-400">•</span>
                                  {assumption}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Missing facts */}
                        {qa.missing_facts.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-900 mb-2">
                              ❓ Manglende informasjon
                            </h4>
                            <ul className="text-sm text-slate-600 space-y-1">
                              {qa.missing_facts.map((fact, fidx) => (
                                <li key={fidx} className="flex items-start gap-2">
                                  <span className="text-slate-400">•</span>
                                  {fact}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {expandedQA !== qa.id && (
                      <button
                        onClick={() => setExpandedQA(qa.id)}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Vis forutsetninger →
                      </button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Less relevant Q&A toggle */}
        {lowRelevanceQA.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowLessRelevant(!showLessRelevant)}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/50 transition-all"
            >
              <span className="font-medium">
                {showLessRelevant ? "Skjul" : "Se"} {lowRelevanceQA.length} mindre relevante spørsmål
              </span>
              <svg
                className={`w-5 h-5 transition-transform ${showLessRelevant ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLessRelevant && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-500 text-center">
                  Disse spørsmålene er mindre spesifikke for din sak, men kan inneholde nyttig bakgrunnsinformasjon.
                </p>
                {lowRelevanceQA.map((qa: QAItem, index: number) => (
                  <Card
                    key={qa.id}
                    variant="bordered"
                    className={`cursor-pointer transition-all opacity-80 hover:opacity-100 ${
                      expandedQA === qa.id ? "ring-2 ring-slate-300" : ""
                    }`}
                  >
                    <div
                      onClick={() => setExpandedQA(expandedQA === qa.id ? null : qa.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-semibold text-sm">
                              {highRelevanceQA.length + index + 1}
                            </span>
                            <h3 className="font-medium text-slate-700 pt-1">
                              {qa.question}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                              {qa.relevance || 5}/10
                            </span>
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${confidenceColors[qa.confidence]}`}
                            >
                              {qa.confidence}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                    </div>

                    <CardContent className="pt-0">
                      <div className="ml-11 space-y-4">
                        <p className="text-slate-600 leading-relaxed">{qa.answer}</p>

                        {/* Citations - Always visible at bottom */}
                        {qa.citations.length > 0 && (
                          <div className="pt-3 border-t border-slate-100">
                            <div className="flex flex-wrap gap-2">
                              {qa.citations.map((citation, cidx) => (
                                <a
                                  key={cidx}
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800 transition-colors"
                                >
                                  <span>📎</span>
                                  <span>
                                    {citation.source_name}
                                    {citation.section && ` ${citation.section}`}
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Expandable section for assumptions and missing facts */}
                        {(qa.assumptions.length > 0 || qa.missing_facts.length > 0) && (
                          <>
                            {expandedQA === qa.id && (
                              <div className="space-y-4 pt-3 border-t border-slate-100">
                                {qa.assumptions.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-slate-900 mb-2">
                                      💭 Forutsetninger
                                    </h4>
                                    <ul className="text-sm text-slate-600 space-y-1">
                                      {qa.assumptions.map((assumption, aidx) => (
                                        <li key={aidx} className="flex items-start gap-2">
                                          <span className="text-slate-400">•</span>
                                          {assumption}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {qa.missing_facts.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-slate-900 mb-2">
                                      ❓ Manglende informasjon
                                    </h4>
                                    <ul className="text-sm text-slate-600 space-y-1">
                                      {qa.missing_facts.map((fact, fidx) => (
                                        <li key={fidx} className="flex items-start gap-2">
                                          <span className="text-slate-400">•</span>
                                          {fact}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                            {expandedQA !== qa.id && (
                              <button
                                onClick={() => setExpandedQA(qa.id)}
                                className="text-sm text-slate-500 hover:text-slate-700 font-medium"
                              >
                                Vis forutsetninger →
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Checklist */}
      <Card variant="bordered">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            ✅ Hva du bør gjøre nå
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checklist.map((item: ChecklistItem) => (
              <label
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  item.completed
                    ? "border-green-300 bg-green-50"
                    : priorityColors[item.priority]
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleChecklist(item.id)}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span
                  className={`text-slate-900 ${item.completed ? "line-through text-slate-500" : ""}`}
                >
                  {item.text}
                </span>
                <span
                  className={`ml-auto flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                    item.priority === "høy"
                      ? "bg-red-200 text-red-800"
                      : item.priority === "middels"
                        ? "bg-amber-200 text-amber-800"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {item.priority}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documentation to gather */}
      <Card variant="bordered">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            📁 Dokumentasjon du bør samle
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.documentation_json.map((doc: DocumentationItem) => (
              <div
                key={doc.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50"
              >
                <span className="text-xl">📄</span>
                <div>
                  <p className="font-medium text-slate-900">{doc.text}</p>
                  <p className="text-sm text-slate-600 mt-1">{doc.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Evidence/Sources used */}
      <Card variant="bordered">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            🔍 Kilder brukt i analysen
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {evidence.map((e: Evidence) => (
              <div
                key={e.id}
                className="p-3 rounded-lg border border-slate-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-amber-700 hover:text-amber-800 hover:underline"
                  >
                    {e.title}
                  </a>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                      e.source_priority === 1
                        ? "bg-green-100 text-green-700"
                        : e.source_priority === 2
                          ? "bg-blue-100 text-blue-700"
                          : e.source_priority === 3
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {e.source_priority === 4
                      ? "uoffisiell"
                      : `prioritet ${e.source_priority}`}
                  </span>
                </div>
                {e.section_hint && (
                  <p className="text-sm text-slate-500 mt-1">
                    {e.section_hint}
                  </p>
                )}
                <p className="text-sm text-slate-600 mt-2 line-clamp-3">
                  {e.excerpt}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
