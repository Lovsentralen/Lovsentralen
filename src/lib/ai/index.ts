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
   - "citations": Liste med {"source_name", "section", "url"} - KRITISK: Hver kilde MÅ verifiseres!
     KRAV FOR HVER CITATION:
     * source_name: Navnet på loven/kilden som FAKTISK støtter påstanden i svaret
     * section: Den EKSAKTE paragrafen som er relevant (f.eks. "§ 27 første ledd", ikke bare "§ 27")
     * url: URL fra evidensen som INNEHOLDER denne paragrafen
     
     VERIFIKASJONSSTEG (gjør dette for HVER citation):
     1. Les svaret du ga - hva er den konkrete juridiske påstanden?
     2. Finn i evidensen hvor denne påstanden støttes
     3. Verifiser at paragrafen du siterer FAKTISK handler om det svaret sier
     4. IKKE gjenbruk samme paragraf for alle svar - finn den SPESIFIKKE paragrafen for HVER påstand
     
     EKSEMPEL PÅ FEIL: Svaret handler om reklamasjonsfrist, men citation viser til § 15 om mangler
     EKSEMPEL PÅ RIKTIG: Svaret handler om reklamasjonsfrist, citation viser til § 27 om reklamasjon
   - "confidence": "lav", "middels", eller "høy"
   - "assumptions": Liste med antakelser som er gjort
   - "missing_facts": Hva som mangler for et bedre svar
   - "relevance": Tall 1-10 for hvor BRUKBART dette svaret er for brukerens rettssak:
     * 10 = Direkte handlingsbart - brukeren kan GJØRE noe konkret basert på dette (f.eks. "du kan kreve X", "du bør sende brev til Y")
     * 8-9 = Svært nyttig - gir brukeren konkrete rettigheter eller frister å forholde seg til
     * 7 = Nyttig - hjelper brukeren forstå sin posisjon og muligheter
     * 5-6 = Bakgrunnsinformasjon - forklarer juridiske konsepter
     * 1-4 = Teoretisk - generell juss uten direkte nytte for denne saken
   - "relevance_reason": Kort forklaring (1-2 setninger) på HVORDAN brukeren kan BRUKE dette svaret i sin sak. Vær konkret og handlingsorientert. Eksempler:
     * "Du kan bruke dette til å kreve pengene tilbake fra Elkjøp ved å vise til forbrukerkjøpsloven § 27."
     * "Dette betyr at du har 2 måneder på deg til å reklamere - send skriftlig klage til selger snarest."
     * "Basert på dette kan du argumentere for at varen hadde en mangel ved levering."

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
- Sorter qa_items etter BRUKBARHET (mest handlingsbare først)
- relevance_reason SKAL forklare HVORDAN brukeren kan bruke svaret i praksis

KRITISK - VERIFISERING AV KILDER:
Før du returnerer JSON, gå gjennom HVER qa_item og verifiser:
1. Les svaret på nytt - hva sier det konkret?
2. For hver citation - støtter denne paragrafen FAKTISK det svaret sier?
3. Er URL-en fra evidensen og inneholder den faktisk denne paragrafen?
4. Hvis citation ikke matcher svaret - FJERN den og finn riktig paragraf

IKKE:
- Gjenbruk samme paragraf (f.eks. § 27) for alle svar
- Siter en paragraf du ikke har sett i evidensen
- Siter feil paragraf bare for å ha en kilde

HUSK: Det er bedre med 1 riktig kilde enn 4 feil kilder!`;

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
