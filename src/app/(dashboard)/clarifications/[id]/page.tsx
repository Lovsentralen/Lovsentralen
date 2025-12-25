import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClarificationForm } from "@/components/case/ClarificationForm";
import { ESCALATION_MESSAGE, SENSITIVE_TOPICS } from "@/types";

export const metadata = {
  title: "Oppklarende spørsmål | Lovsentralen",
  description: "Svar på spørsmål for å få bedre juridisk veiledning",
};

interface ClarificationsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClarificationsPage({
  params,
}: ClarificationsPageProps) {
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

  // If already completed, redirect to results
  if (caseData.status === "completed") {
    redirect(`/results/${id}`);
  }

  // Fetch clarifications
  const { data: clarifications } = await supabase
    .from("clarifications")
    .select("*")
    .eq("case_id", id)
    .order("order_index", { ascending: true });

  // Check for sensitive topics
  const faktumLower = caseData.faktum_text.toLowerCase();
  const hasSensitiveTopic = SENSITIVE_TOPICS.some((topic) =>
    faktumLower.includes(topic.toLowerCase()),
  );

  return (
    <ClarificationForm
      caseId={id}
      clarifications={clarifications || []}
      faktumText={caseData.faktum_text}
      escalationWarning={hasSensitiveTopic ? ESCALATION_MESSAGE : null}
    />
  );
}
