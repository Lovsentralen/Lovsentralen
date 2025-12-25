import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui";
import { CATEGORY_LABELS, type Case } from "@/types";
import { DeleteCaseButton } from "@/components/case/DeleteCaseButton";

export const metadata = {
  title: "Mine saker | Lovsentralen",
  description: "Se og administrer dine tidligere juridiske henvendelser",
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: cases } = await supabase
    .from("cases")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: "Utkast", color: "bg-slate-100 text-slate-700" },
    clarifying: {
      label: "Venter på svar",
      color: "bg-amber-100 text-amber-700",
    },
    analyzing: { label: "Analyserer...", color: "bg-blue-100 text-blue-700" },
    completed: { label: "Fullført", color: "bg-green-100 text-green-700" },
    error: { label: "Feil", color: "bg-red-100 text-red-700" },
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nb-NO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLinkForCase = (caseItem: Case) => {
    if (caseItem.status === "completed") {
      return `/results/${caseItem.id}`;
    }
    if (caseItem.status === "clarifying" || caseItem.status === "draft") {
      return `/clarifications/${caseItem.id}`;
    }
    return `/results/${caseItem.id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mine saker</h1>
          <p className="text-slate-600 mt-1">
            Oversikt over dine juridiske henvendelser
          </p>
        </div>
        <Link
          href="/faktum"
          className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium shadow-lg shadow-amber-500/25"
        >
          + Ny sak
        </Link>
      </div>

      {!cases || cases.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Ingen saker ennå
            </h2>
            <p className="text-slate-600 mb-6">
              Start din første juridiske henvendelse for å se den her.
            </p>
            <Link
              href="/faktum"
              className="inline-flex px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              Opprett ny sak
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cases.map((caseItem) => (
            <Card
              key={caseItem.id}
              variant="elevated"
              className="hover:shadow-lg transition-shadow"
            >
              <Link href={getLinkForCase(caseItem)}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusLabels[caseItem.status]?.color || "bg-slate-100 text-slate-700"}`}
                        >
                          {statusLabels[caseItem.status]?.label ||
                            caseItem.status}
                        </span>
                        {caseItem.category && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            {CATEGORY_LABELS[
                              caseItem.category as keyof typeof CATEGORY_LABELS
                            ] || caseItem.category}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-900 font-medium line-clamp-2 mb-2">
                        {caseItem.faktum_text}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatDate(caseItem.created_at)}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.preventDefault()}
                    >
                      <DeleteCaseButton caseId={caseItem.id} />
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
