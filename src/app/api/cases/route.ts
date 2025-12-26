import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateClarifyingQuestions, detectSensitiveTopics, extractLegalIssues } from "@/lib/ai";
import { searchMultipleQueries, generateSearchQueries } from "@/lib/google-search";
import { fetchMultiplePages, extractRelevantExcerpts } from "@/lib/google-search/parser";
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

    // FULL SEARCH PROCESS - Same as analysis phase, but to find relevant clarifying questions
    let legalContext = "";
    try {
      console.log("Starting full search process for clarifying questions...");
      
      // Step 1: Extract legal issues from faktum (without clarifications yet)
      const legalIssues = await extractLegalIssues(faktum_text, []);
      console.log(`Identified ${legalIssues.length} legal issues`);
      
      // Step 2: Generate search queries for each issue
      const allQueries: string[] = [];
      for (const issue of legalIssues) {
        const queries = generateSearchQueries(issue.issue, issue.domain);
        allQueries.push(...queries);
      }
      console.log(`Generated ${allQueries.length} search queries`);
      
      // Step 3: Execute searches (limit to 10 queries for speed)
      const searchResults = await searchMultipleQueries(allQueries.slice(0, 10));
      console.log(`Found ${searchResults.length} search results`);
      
      // Step 4: Fetch and parse pages (limit to 8 for speed)
      const urls = searchResults.slice(0, 8).map(r => r.url);
      const parsedPages = await fetchMultiplePages(urls);
      console.log(`Parsed ${parsedPages.length} pages`);
      
      // Step 5: Extract relevant excerpts for each issue
      const allExcerpts: string[] = [];
      for (const issue of legalIssues) {
        const excerpts = extractRelevantExcerpts(parsedPages, issue.issue, 3);
        for (const excerpt of excerpts) {
          allExcerpts.push(
            `[${excerpt.source.title}${excerpt.section ? ` ${excerpt.section}` : ""}]\n${excerpt.excerpt.slice(0, 800)}`
          );
        }
      }
      
      // Build rich legal context
      legalContext = `
IDENTIFISERTE JURIDISKE PROBLEMSTILLINGER:
${legalIssues.map((i, idx) => `${idx + 1}. ${i.issue} (${i.domain})`).join("\n")}

RELEVANTE RETTSKILDER FUNNET:
${allExcerpts.slice(0, 6).join("\n\n---\n\n")}

Bruk denne informasjonen til å identifisere HVILKE FAKTA som faktisk mangler for å kunne anvende reglene korrekt.
Still BARE spørsmål om fakta som er AVGJØRENDE for vilkårene i de relevante lovbestemmelsene.
IKKE spør om generelle ting som "når skjedde dette" med mindre tidspunktet faktisk er juridisk relevant (f.eks. for frister).
      `.trim();
      
      console.log("Legal context built successfully");
    } catch (error) {
      console.error("Error in full search process:", error);
      // Continue without context if search fails
    }

    // Generate clarifying questions WITH rich legal context from full search
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
