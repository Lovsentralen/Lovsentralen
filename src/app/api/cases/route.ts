import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateClarifyingQuestions, detectSensitiveTopics, quickExtractLegalDomain } from "@/lib/ai";
import { searchGoogle } from "@/lib/google-search";
import { fetchAndParsePage } from "@/lib/google-search/parser";
import type { LegalCategory } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const body = await request.json();
    const { faktum_text, category } = body as {
      faktum_text: string;
      category: LegalCategory | null;
    };

    if (!faktum_text || faktum_text.trim().length < 50) {
      return NextResponse.json(
        { error: "Faktum må være minst 50 tegn" },
        { status: 400 },
      );
    }

    // Create the case
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .insert({
        user_id: user.id,
        faktum_text: faktum_text.trim(),
        category,
        status: "clarifying",
      })
      .select()
      .single();

    if (caseError) {
      console.error("Error creating case:", caseError);
      return NextResponse.json(
        { error: "Kunne ikke opprette sak" },
        { status: 500 },
      );
    }

    // Check for sensitive topics
    const sensitivityCheck = await detectSensitiveTopics(faktum_text);

    // Step 1: Quick extract legal domain and search terms
    const { domain, searchTerms } = await quickExtractLegalDomain(faktum_text, category);
    
    // Step 2: Do a preliminary search to get legal context
    let legalContext = "";
    try {
      // Search for the most relevant legal source
      const searchQuery = `${searchTerms.slice(0, 2).join(" ")} ${domain} lovdata norsk lov`;
      const searchResults = await searchGoogle(searchQuery, 5);
      
      // Fetch the top 2 results to get context
      const topUrls = searchResults.slice(0, 2).map(r => r.url);
      const pageContents: string[] = [];
      
      for (const url of topUrls) {
        const page = await fetchAndParsePage(url);
        if (page) {
          // Extract key sections mentioning relevant terms
          const relevantContent = page.sections
            .filter(s => s.section_number || s.content.length > 100)
            .slice(0, 3)
            .map(s => `${s.section_number ? `${s.section_number}: ` : ""}${s.content.slice(0, 500)}`)
            .join("\n");
          
          if (relevantContent) {
            pageContents.push(`[${page.title}]\n${relevantContent}`);
          }
        }
      }
      
      legalContext = pageContents.join("\n\n---\n\n");
    } catch (error) {
      console.error("Error in preliminary search:", error);
      // Continue without context if search fails
    }

    // Generate clarifying questions WITH legal context
    const questions = await generateClarifyingQuestions(faktum_text, category, legalContext || undefined);

    // Save clarifications
    const clarificationInserts = questions.map((question, index) => ({
      case_id: caseData.id,
      question,
      order_index: index,
    }));

    const { error: clarError } = await supabase
      .from("clarifications")
      .insert(clarificationInserts);

    if (clarError) {
      console.error("Error creating clarifications:", clarError);
    }

    return NextResponse.json({
      data: {
        ...caseData,
        sensitivity: sensitivityCheck,
        clarifications_count: questions.length,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/cases:", error);
    return NextResponse.json(
      { error: "En uventet feil oppsto" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching cases:", error);
      return NextResponse.json(
        { error: "Kunne ikke hente saker" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in GET /api/cases:", error);
    return NextResponse.json(
      { error: "En uventet feil oppsto" },
      { status: 500 },
    );
  }
}
