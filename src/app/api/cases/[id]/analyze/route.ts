import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  searchMultipleQueries,
  generateSearchQueries,
} from "@/lib/google-search";
import {
  fetchMultiplePages,
  extractRelevantExcerpts,
} from "@/lib/google-search/parser";
import { extractLegalIssues, generateLegalAnalysis } from "@/lib/ai";

export async function POST(
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

    // Fetch case with clarifications
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: "Sak ikke funnet" }, { status: 404 });
    }

    // Update status to analyzing
    await supabase.from("cases").update({ status: "analyzing" }).eq("id", id);

    // Fetch clarifications
    const { data: clarifications } = await supabase
      .from("clarifications")
      .select("*")
      .eq("case_id", id)
      .order("order_index");

    const clarificationPairs = (clarifications || [])
      .filter((c) => c.user_answer)
      .map((c) => ({ question: c.question, answer: c.user_answer! }));

    // Step 1: Extract legal issues
    const legalIssues = await extractLegalIssues(
      caseData.faktum_text,
      clarificationPairs,
    );

    // Step 2: Generate search queries for each issue
    const allQueries: string[] = [];
    for (const issue of legalIssues) {
      const queries = generateSearchQueries(issue.issue, issue.domain);
      allQueries.push(...queries);
    }

    // Step 3: Execute Google searches
    const searchResults = await searchMultipleQueries(allQueries.slice(0, 20)); // Limit queries

    // Step 4: Fetch and parse pages
    const urls = searchResults.slice(0, 15).map((r) => r.url); // Limit pages to fetch
    const parsedPages = await fetchMultiplePages(urls);

    // Step 5: Extract relevant excerpts as evidence
    interface EvidenceItem {
      case_id: string;
      source_name: string;
      url: string;
      title: string;
      excerpt: string;
      section_hint: string | null;
      source_priority: number;
    }

    const evidenceItems: EvidenceItem[] = [];
    for (const issue of legalIssues) {
      const excerpts = extractRelevantExcerpts(parsedPages, issue.issue, 4);
      for (const excerpt of excerpts) {
        evidenceItems.push({
          case_id: id,
          source_name: excerpt.source.title,
          url: excerpt.source.url,
          title: excerpt.source.title,
          excerpt: excerpt.excerpt,
          section_hint: excerpt.section,
          source_priority: excerpt.source.source_priority,
        });
      }
    }

    // Deduplicate evidence by URL
    const uniqueEvidence = evidenceItems.reduce((acc: EvidenceItem[], item) => {
      if (!acc.some((e) => e.url === item.url)) {
        acc.push(item);
      }
      return acc;
    }, []);

    // Save evidence to database
    if (uniqueEvidence.length > 0) {
      await supabase.from("evidence").insert(uniqueEvidence);
    }

    // Fetch saved evidence (for IDs)
    const { data: savedEvidence } = await supabase
      .from("evidence")
      .select("*")
      .eq("case_id", id);

    // Step 6: Generate grounded legal analysis
    const analysis = await generateLegalAnalysis(
      caseData.faktum_text,
      clarificationPairs,
      savedEvidence || [],
    );

    // Save results
    const { error: resultError } = await supabase.from("results").insert({
      case_id: id,
      qa_json: analysis.qa_items,
      checklist_json: analysis.checklist,
      documentation_json: analysis.documentation,
      sources_json: analysis.sources,
    });

    if (resultError) {
      console.error("Error saving results:", resultError);
      await supabase.from("cases").update({ status: "error" }).eq("id", id);
      return NextResponse.json(
        { error: "Kunne ikke lagre resultater" },
        { status: 500 },
      );
    }

    // Update case status to completed
    await supabase.from("cases").update({ status: "completed" }).eq("id", id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/cases/[id]/analyze:", error);

    // Update case status to error
    const { id } = await params;
    const supabase = await createClient();
    await supabase.from("cases").update({ status: "error" }).eq("id", id);

    return NextResponse.json(
      { error: "En feil oppsto under analysen" },
      { status: 500 },
    );
  }
}
