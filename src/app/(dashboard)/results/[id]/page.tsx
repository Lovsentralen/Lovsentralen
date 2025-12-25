import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResultsDisplay } from "@/components/case/ResultsDisplay";

export const metadata = {
  title: "Resultater | Lovsentralen",
  description: "Din juridiske analyse fra Lovsentralen",
};

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch case
  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (caseError || !caseData) {
    redirect("/faktum");
  }

  // If not completed, redirect to appropriate step
  if (caseData.status === "draft" || caseData.status === "clarifying") {
    redirect(`/clarifications/${id}`);
  }

  // If still analyzing, show loading state with progress
  if (caseData.status === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mx-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-amber-600 animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Analyserer din sak
            </h2>
            <p className="text-slate-600">
              Vi søker gjennom norske rettskilder for å gi deg en presis analyse
            </p>
          </div>

          {/* Animated progress bar */}
          <div className="mb-6">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full animate-pulse"
                style={{ width: "75%", animation: "pulse 2s infinite, progress 30s linear forwards" }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium text-green-700">Identifisert juridiske problemstillinger</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium text-green-700">Søkt i norske rettskilder</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              </div>
              <span className="text-sm font-medium text-amber-700">Genererer tilpasset analyse...</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                <span className="text-sm font-medium">4</span>
              </div>
              <span className="text-sm font-medium text-slate-500">Ferdigstiller resultat</span>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 mt-6">
            ⏱️ Siden oppdateres automatisk når analysen er ferdig
          </p>
        </div>
        <meta httpEquiv="refresh" content="5" />
      </div>
    );
  }

  // If error, show error state
  if (caseData.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-3xl">❌</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Noe gikk galt
        </h1>
        <p className="text-slate-600 max-w-md mb-6">
          Vi kunne ikke fullføre analysen av din sak. Dette kan skyldes tekniske
          problemer.
        </p>
        <a
          href="/faktum"
          className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
        >
          Prøv igjen med ny sak
        </a>
      </div>
    );
  }

  // Fetch results
  const { data: result, error: resultError } = await supabase
    .from("results")
    .select("*")
    .eq("case_id", id)
    .single();

  if (resultError || !result) {
    redirect(`/clarifications/${id}`);
  }

  // Fetch evidence
  const { data: evidence } = await supabase
    .from("evidence")
    .select("*")
    .eq("case_id", id)
    .order("source_priority", { ascending: true });

  return (
    <ResultsDisplay
      caseData={caseData}
      result={result}
      evidence={evidence || []}
    />
  );
}
