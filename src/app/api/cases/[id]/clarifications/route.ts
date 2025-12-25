import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    // Verify case ownership
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: "Sak ikke funnet" }, { status: 404 });
    }

    const body = await request.json();
    const { answers } = body as { answers: Record<string, string> };

    // Update each clarification with the answer
    for (const [clarificationId, answer] of Object.entries(answers)) {
      if (answer && answer.trim()) {
        await supabase
          .from("clarifications")
          .update({ user_answer: answer.trim() })
          .eq("id", clarificationId)
          .eq("case_id", id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/cases/[id]/clarifications:", error);
    return NextResponse.json(
      { error: "En uventet feil oppsto" },
      { status: 500 },
    );
  }
}
