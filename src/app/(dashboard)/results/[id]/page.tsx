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

  // If still analyzing, show loading state
  if (caseData.status === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-6" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Analyserer din sak...
        </h1>
        <p className="text-slate-600 max-w-md">
          Vi søker gjennom norske rettskilder og genererer en tilpasset analyse.
          Dette kan ta opptil ett minutt.
        </p>
        <p className="text-sm text-slate-500 mt-4">
          Siden oppdateres automatisk når analysen er ferdig.
        </p>
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
