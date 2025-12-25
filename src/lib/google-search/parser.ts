import * as cheerio from "cheerio";
import type { ParsedPage, PageSection } from "@/types";
import { getSourcePriority } from "./index";

const SECTION_PATTERN = /§\s*\d+[a-z]?(?:-\d+)?/gi;
const CHAPTER_PATTERN = /(?:kapittel|kap\.?)\s*\d+/gi;

export async function fetchAndParsePage(
  url: string,
): Promise<ParsedPage | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Lovsentralen/1.0; +https://lovsentralen.no)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8,nn;q=0.7,en;q=0.6",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    return parsePage(url, html);
  } catch (error) {
    console.error(`Error fetching page ${url}:`, error);
    return null;
  }
}

export function parsePage(url: string, html: string): ParsedPage {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $(
    "script, style, nav, header, footer, aside, .menu, .sidebar, .navigation, .advertisement, .cookie-notice",
  ).remove();

  // Get title
  const title =
    $("title").text().trim() ||
    $("h1").first().text().trim() ||
    "Ukjent tittel";

  // Get main content
  const mainContent = getMainContent($);

  // Extract sections
  const sections = extractSections($, mainContent);

  return {
    url,
    title,
    content: mainContent,
    sections,
    source_priority: getSourcePriority(url),
  };
}

function getMainContent($: cheerio.CheerioAPI): string {
  // Try to find main content container
  const contentSelectors = [
    "main",
    "article",
    ".content",
    ".main-content",
    "#content",
    "#main",
    ".article-content",
    ".post-content",
    // Lovdata specific
    ".markup",
    ".law-content",
  ];

  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      const text = element.text().trim();
      if (text.length > 200) {
        return cleanText(text);
      }
    }
  }

  // Fallback: get body text
  return cleanText($("body").text());
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim().slice(0, 50000); // Limit content size
}

function extractSections(
  $: cheerio.CheerioAPI,
  content: string,
): PageSection[] {
  const sections: PageSection[] = [];

  // Find all headings
  $("h1, h2, h3, h4").each((_, el) => {
    const heading = $(el).text().trim();
    const nextContent = $(el).nextUntil("h1, h2, h3, h4").text().trim();

    // Extract section number if present
    const sectionMatch = heading.match(SECTION_PATTERN);
    const chapterMatch = heading.match(CHAPTER_PATTERN);

    if (heading && nextContent) {
      sections.push({
        heading,
        content: cleanText(nextContent).slice(0, 5000),
        section_number: sectionMatch?.[0] || chapterMatch?.[0] || null,
      });
    }
  });

  // Also extract paragraphs that contain § references
  const sectionMatches = content.match(SECTION_PATTERN);
  if (sectionMatches) {
    const uniqueSections = [...new Set(sectionMatches)];
    for (const section of uniqueSections.slice(0, 20)) {
      // Limit to 20 sections
      // Find content around this section reference
      const index = content.indexOf(section);
      if (index !== -1) {
        const start = Math.max(0, index - 200);
        const end = Math.min(content.length, index + 800);
        const excerpt = content.slice(start, end);

        // Avoid duplicates
        if (!sections.some((s) => s.section_number === section)) {
          sections.push({
            heading: section,
            content: cleanText(excerpt),
            section_number: section,
          });
        }
      }
    }
  }

  return sections;
}

export async function fetchMultiplePages(
  urls: string[],
): Promise<ParsedPage[]> {
  const pages: ParsedPage[] = [];

  // Fetch pages in parallel with concurrency limit
  const concurrencyLimit = 5;
  const chunks = [];

  for (let i = 0; i < urls.length; i += concurrencyLimit) {
    chunks.push(urls.slice(i, i + concurrencyLimit));
  }

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map((url) => fetchAndParsePage(url)),
    );

    for (const page of results) {
      if (page) {
        pages.push(page);
      }
    }
  }

  return pages;
}

export function extractRelevantExcerpts(
  pages: ParsedPage[],
  issue: string,
  maxExcerpts = 8,
): { excerpt: string; source: ParsedPage; section: string | null }[] {
  const excerpts: {
    excerpt: string;
    source: ParsedPage;
    section: string | null;
  }[] = [];
  const issueKeywords = issue.toLowerCase().split(/\s+/);

  for (const page of pages) {
    // Check sections first
    for (const section of page.sections) {
      const sectionLower = section.content.toLowerCase();
      const relevanceScore = issueKeywords.filter((kw) =>
        sectionLower.includes(kw),
      ).length;

      if (relevanceScore >= 1) {
        excerpts.push({
          excerpt: section.content.slice(0, 1000),
          source: page,
          section: section.section_number,
        });
      }
    }

    // Also check main content for relevant paragraphs
    const paragraphs = page.content.split(/\n+/);
    for (const para of paragraphs) {
      if (para.length < 100) continue;

      const paraLower = para.toLowerCase();
      const relevanceScore = issueKeywords.filter((kw) =>
        paraLower.includes(kw),
      ).length;

      if (relevanceScore >= 2) {
        excerpts.push({
          excerpt: para.slice(0, 1000),
          source: page,
          section: para.match(SECTION_PATTERN)?.[0] || null,
        });
      }
    }
  }

  // Sort by source priority and return top excerpts
  return excerpts
    .sort((a, b) => a.source.source_priority - b.source.source_priority)
    .slice(0, maxExcerpts);
}
