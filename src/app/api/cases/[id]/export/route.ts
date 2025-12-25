import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type {
  Case,
  Result,
  Evidence,
  QAItem,
  ChecklistItem,
  DocumentationItem,
} from "@/types";

// Simple PDF generation using a text-based approach
// For production, consider using @react-pdf/renderer or puppeteer

export async function GET(
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

    // Fetch all case data
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: "Sak ikke funnet" }, { status: 404 });
    }

    const { data: result } = await supabase
      .from("results")
      .select("*")
      .eq("case_id", id)
      .single();

    const { data: evidence } = await supabase
      .from("evidence")
      .select("*")
      .eq("case_id", id);

    // Generate a simple text-based report
    const report = generateTextReport(
      caseData as Case,
      result as Result | null,
      (evidence || []) as Evidence[],
    );

    // Return as plain text for now
    // In production, you'd generate a proper PDF here
    return new NextResponse(report, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="lovsentralen-rapport-${id.slice(0, 8)}.txt"`,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/cases/[id]/export:", error);
    return NextResponse.json(
      { error: "Kunne ikke eksportere rapport" },
      { status: 500 },
    );
  }
}

function generateTextReport(
  caseData: Case,
  result: Result | null,
  evidence: Evidence[],
): string {
  const date = new Date().toLocaleDateString("nb-NO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let report = `
════════════════════════════════════════════════════════════════════════════════
                            LOVSENTRALEN - JURIDISK RAPPORT
════════════════════════════════════════════════════════════════════════════════

Dato: ${date}
Sak-ID: ${caseData.id}

────────────────────────────────────────────────────────────────────────────────
                                    ANSVARSFRASKRIVELSE
────────────────────────────────────────────────────────────────────────────────

⚠️  VIKTIG: Dette dokumentet inneholder generell juridisk informasjon, IKKE
    juridisk rådgivning. For konkrete saker bør du alltid konsultere en advokat.
    Lovsentralen tar ikke ansvar for beslutninger tatt basert på denne rapporten.

────────────────────────────────────────────────────────────────────────────────
                                    DIN SITUASJON
────────────────────────────────────────────────────────────────────────────────

${caseData.faktum_text}

`;

  if (result) {
    report += `
────────────────────────────────────────────────────────────────────────────────
                                  SPØRSMÅL OG SVAR
────────────────────────────────────────────────────────────────────────────────

`;

    result.qa_json.forEach((qa: QAItem, index: number) => {
      report += `
${index + 1}. ${qa.question}
   
   Svar: ${qa.answer}
   
   Konfidensgrad: ${qa.confidence}
   
   Kilder:
${qa.citations.map((c) => `   • ${c.source_name}${c.section ? ` ${c.section}` : ""}\n     ${c.url}`).join("\n")}

`;
    });

    report += `
────────────────────────────────────────────────────────────────────────────────
                                HVA DU BØR GJØRE NÅ
────────────────────────────────────────────────────────────────────────────────

`;

    result.checklist_json.forEach((item: ChecklistItem) => {
      report += `☐ ${item.text} (${item.priority} prioritet)\n`;
    });

    report += `
────────────────────────────────────────────────────────────────────────────────
                              DOKUMENTASJON Å SAMLE
────────────────────────────────────────────────────────────────────────────────

`;

    result.documentation_json.forEach((doc: DocumentationItem) => {
      report += `• ${doc.text}\n  Hvorfor: ${doc.reason}\n\n`;
    });
  }

  if (evidence.length > 0) {
    report += `
────────────────────────────────────────────────────────────────────────────────
                                  KILDER BRUKT
────────────────────────────────────────────────────────────────────────────────

`;

    evidence.forEach((e: Evidence) => {
      report += `• ${e.title}\n  ${e.url}\n\n`;
    });
  }

  report += `
════════════════════════════════════════════════════════════════════════════════
                              © Lovsentralen ${new Date().getFullYear()}
════════════════════════════════════════════════════════════════════════════════
`;

  return report;
}
