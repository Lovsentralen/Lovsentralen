import type { SearchResult, SourcePriority } from "@/types";

// Priority domains for Norwegian legal sources
const PRIORITY_1_DOMAINS = [
  "lovdata.no",
  "regjeringen.no",
  "stortinget.no",
  "domstol.no",
];

const PRIORITY_2_DOMAINS = [
  "forbrukertilsynet.no",
  "forbrukerradet.no",
  "arbeidstilsynet.no",
  "datatilsynet.no",
  "skatteetaten.no",
  "nav.no",
];

const PRIORITY_3_DOMAINS = [
  "sivilombudet.no",
  "husleietvistutvalget.no",
  "finansklagenemnda.no",
  "forbruker.no",
];

const BLACKLISTED_DOMAINS = [
  "reddit.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "quora.com",
  "medium.com",
];

export function getSourcePriority(url: string): SourcePriority {
  try {
    const domain = new URL(url).hostname.replace("www.", "");

    if (PRIORITY_1_DOMAINS.some((d) => domain.includes(d))) return 1;
    if (PRIORITY_2_DOMAINS.some((d) => domain.includes(d))) return 2;
    if (PRIORITY_3_DOMAINS.some((d) => domain.includes(d))) return 3;
    return 4;
  } catch {
    return 4;
  }
}

export function isBlacklistedDomain(url: string): boolean {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return BLACKLISTED_DOMAINS.some((d) => domain.includes(d));
  } catch {
    return true;
  }
}

/**
 * Search using Serper.dev API (much simpler than Google PSE)
 * Sign up at https://serper.dev to get an API key
 */
export async function searchGoogle(
  query: string,
  numResults = 10,
): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "SERPER_API_KEY environment variable is not set. Get one at https://serper.dev",
    );
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        gl: "no", // Geographic location: Norway
        hl: "no", // Language: Norwegian
        num: numResults,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Serper API error:", error);
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();

    // Serper returns results in 'organic' array
    interface SerperResult {
      title: string;
      link: string;
      snippet?: string;
    }

    const organic: SerperResult[] = data.organic || [];

    return organic
      .filter((item) => !isBlacklistedDomain(item.link))
      .map((item) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet || "",
        displayLink: new URL(item.link).hostname,
      }));
  } catch (error) {
    console.error("Error searching with Serper:", error);
    throw error;
  }
}

export async function searchMultipleQueries(
  queries: string[],
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    try {
      const results = await searchGoogle(query);

      for (const result of results) {
        // Deduplicate by URL
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          allResults.push(result);
        }
      }

      // Small delay between requests to be respectful to the API
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error searching for query "${query}":`, error);
    }
  }

  // Sort by source priority
  return allResults.sort((a, b) => {
    const priorityA = getSourcePriority(a.url);
    const priorityB = getSourcePriority(b.url);
    return priorityA - priorityB;
  });
}

export function generateSearchQueries(issue: string, domain: string): string[] {
  const queries: string[] = [];

  // Base query with issue and domain
  queries.push(`${issue} ${domain} norsk lov`);

  // Query targeting Lovdata specifically
  queries.push(`${issue} lovdata §`);

  // Query with domain-specific terms
  const domainKeywords: Record<string, string[]> = {
    forbrukerkjop: ["forbrukerkjøpsloven", "kjøpsloven", "reklamasjon"],
    husleie: ["husleieloven", "leietaker", "utleier"],
    arbeidsrett: ["arbeidsmiljøloven", "arbeidsforhold", "oppsigelse"],
    personvern: ["personopplysningsloven", "GDPR", "datatilsynet"],
    kontrakt: ["avtaleloven", "kontraktsbrudd", "avtale"],
    erstatning: ["skadeserstatningsloven", "erstatningsansvar", "skade"],
  };

  const keywords = domainKeywords[domain.toLowerCase()] || [];
  if (keywords.length > 0) {
    queries.push(`${issue} ${keywords[0]}`);
  }

  return queries;
}
