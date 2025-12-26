import OpenAI from "openai";
import type {
  LegalIssue,
  QAItem,
  ChecklistItem,
  DocumentationItem,
  LegalSource,
  Evidence,
} from "@/types";

// Lazy-loaded OpenAI client to avoid build-time initialization
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `Du er en juridisk rådgiver-assistent som hjelper norske brukere med å forstå deres rettigheter og plikter.

VIKTIGE REGLER:
1. Svar ALLTID på norsk (bokmål)
2. Bruk et klart, enkelt språk som ikke-jurister kan forstå
3. ALDRI gi konkrete råd uten å ha evidens fra søkeresultatene
4. Hvis du er usikker, si det tydelig og forklar hvorfor
5. Henvis ALLTID til kilder med § og lovnavn når relevant
6. Dette er IKKE erstatning for juridisk rådgivning fra advokat

DISCLAIMER som må inkluderes:
"Dette er kun generell informasjon og ikke juridisk rådgivning. For konkrete juridiske spørsmål, kontakt en advokat."`;

export async function extractLegalIssues(
  faktum: string,
  clarifications: { question: string; answer: string }[],
): Promise<LegalIssue[]> {
  const openai = getOpenAI();
  const clarificationText = clarifications
    .map((c) => `Spørsmål: ${c.question}\nSvar: ${c.answer}`)
    .join("\n\n");

  const prompt = `Analyser følgende faktum og klargjøringer for å identifisere de juridiske problemstillingene.

FAKTUM:
${faktum}

KLARGJØRINGER:
${clarificationText || "Ingen klargjøringer gitt."}

Returner en JSON-liste med juridiske problemstillinger i følgende format:
[
  { "issue": "Kort beskrivelse av problemstillingen", "domain": "Rettsområde (f.eks. Forbrukerkjøp, Husleie, Arbeidsrett)" }
]

Identifiser 2-5 hovedproblemstillinger.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || '{"issues": []}';
  const parsed = JSON.parse(content);
  return parsed.issues || parsed;
}

export async function generateClarifyingQuestions(
  faktum: string,
  category: string | null,
  legalContext?: string,
): Promise<string[]> {
  const openai = getOpenAI();
  
  const contextSection = legalContext 
    ? `\nJURIDISK KONTEKST FRA RETTSKILDER:\n${legalContext}`
    : "";

  const prompt = `Du skal vurdere om det trengs oppklarende spørsmål for å forstå brukerens juridiske situasjon.

FAKTUM:
${faktum}

KATEGORI: ${category || "Ikke spesifisert"}
${contextSection}

VIKTIG: Still BARE spørsmål som er NØDVENDIGE for å dekke hull i faktum.
- Hvis faktum er tilstrekkelig, still INGEN spørsmål (returner tom liste)
- De fleste saker trenger bare 0-2 spørsmål, sjelden 3

${legalContext ? `Bruk rettskildene til å identifisere hvilke VILKÅR i loven som krever mer informasjon.
IKKE spør om "når skjedde dette" med mindre det er juridisk avgjørende (f.eks. for frister).
Spør BARE om fakta som faktisk påvirker den juridiske vurderingen.` : `Fokuser på:
- Partsforhold (forbruker/næringsdrivende) - KUN hvis uklart
- Varsling/reklamasjon - KUN hvis ikke nevnt`}

Returner som JSON:
{ "questions": [] } // Hvis faktum er tilstrekkelig
{ "questions": ["Spørsmål 1"] } // Ofte nok med 1
{ "questions": ["Spørsmål 1", "Spørsmål 2"] } // Sjelden mer`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || '{"questions": []}';
  const parsed = JSON.parse(content);
  // Ensure maximum of 3 questions
  return (parsed.questions || []).slice(0, 3);
}

export async function generateLegalAnalysis(
  faktum: string,
  clarifications: { question: string; answer: string }[],
  evidence: Evidence[],
): Promise<{
  qa_items: QAItem[];
  checklist: ChecklistItem[];
  documentation: DocumentationItem[];
  sources: LegalSource[];
}> {
  const openai = getOpenAI();
  const clarificationText = clarifications
    .map((c) => `Spørsmål: ${c.question}\nSvar: ${c.answer}`)
    .join("\n\n");

  const evidenceText = evidence
    .map(
      (e) =>
        `[${e.source_name}${e.section_hint ? ` ${e.section_hint}` : ""}]\nURL: ${e.url}\n${e.excerpt}`,
    )
    .join("\n\n---\n\n");

  const prompt = `Basert på faktumet, klargjøringene og den innhentede evidensen, generer en komplett juridisk analyse.

FAKTUM:
${faktum}

KLARGJØRINGER:
${clarificationText || "Ingen klargjøringer gitt."}

INNHENTET EVIDENS:
${evidenceText}

Du skal returnere en JSON-struktur med følgende:

1. "qa_items": Nøyaktig 10 spørsmål og svar som brukeren sannsynligvis lurer på. Hvert element skal ha:
   - "id": unik ID (qa1, qa2, etc.)
   - "question": Et relevant spørsmål brukeren kan ha
   - "answer": Et grundig svar basert på evidensen
   - "citations": Liste med {"source_name", "section", "url"} - Hvert svar bør ha 2-4 kilder
   - "confidence": "lav", "middels", eller "høy"
   - "assumptions": Liste med antakelser som er gjort
   - "missing_facts": Hva som mangler for et bedre svar
   - "relevance": Tall 1-10 for hvor relevant dette er for brukerens spesifikke sak (10=avgjørende, 7+=viktig, <7=bakgrunn)
   - "relevance_reason": Kort forklaring (1-2 setninger) på HVORFOR dette svaret er relevant for denne brukerens situasjon. Referer til konkrete detaljer fra faktum. Eksempel: "Siden du kjøpte varen for 3 uker siden, er reklamasjonsfristen spesielt viktig for din sak."

2. "checklist": 5-8 konkrete handlinger brukeren bør gjøre, med:
   - "id": unik ID
   - "text": Hva brukeren bør gjøre
   - "priority": "høy", "middels", eller "lav"
   - "completed": false

3. "documentation": 3-6 dokumenter brukeren bør samle/ta vare på, med:
   - "id": unik ID  
   - "text": Beskrivelse av dokumentet
   - "reason": Hvorfor det er viktig

4. "sources": De viktigste rettskildene brukt, med:
   - "name": Navn på kilden (f.eks. "Forbrukerkjøpsloven")
   - "url": Link til kilden
   - "description": Kort beskrivelse av relevansen
   - "priority": 1-4 (1=primær rettskilde, 4=uoffisiell)

VIKTIG:
- Hver påstand SKAL referere til evidensen
- Hvis noe ikke kan bekreftes av evidensen, si det eksplisitt
- Konfidensen skal reflektere hvor godt evidensen støtter svaret
- Svarene skal være på norsk, i et enkelt språk
- Sorter qa_items etter relevance (høyest først)
- relevance_reason SKAL forklare hvorfor svaret er viktig for DENNE brukerens situasjon`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
    max_tokens: 8000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  return {
    qa_items: parsed.qa_items || [],
    checklist: parsed.checklist || [],
    documentation: parsed.documentation || [],
    sources: parsed.sources || [],
  };
}

export async function detectSensitiveTopics(faktum: string): Promise<{
  isSensitive: boolean;
  topics: string[];
  escalationNeeded: boolean;
}> {
  const openai = getOpenAI();
  const prompt = `Analyser følgende faktum for sensitive emner som krever advokat.

FAKTUM:
${faktum}

Sjekk for:
1. Straffesaker eller kriminelle forhold
2. Immigrasjon eller oppholdstillatelse
3. Barn, foreldreansvar eller barnevern
4. Store økonomiske verdier (over 500 000 kr)
5. Alvorlige arbeidsrettssaker (oppsigelse, trakassering)
6. Personskade eller alvorlig helseskade

Returner JSON:
{
  "isSensitive": true/false,
  "topics": ["liste over sensitive emner funnet"],
  "escalationNeeded": true/false,
  "reason": "Begrunnelse for vurderingen"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}

export function buildEvidenceContext(evidence: Evidence[]): string {
  return evidence
    .sort((a, b) => a.source_priority - b.source_priority)
    .map(
      (
        e,
        i,
      ) => `[Kilde ${i + 1}: ${e.source_name}${e.section_hint ? ` ${e.section_hint}` : ""}]
URL: ${e.url}
---
${e.excerpt}
---`,
    )
    .join("\n\n");
}
