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
   - "citations": Liste med {"source_name", "section", "url"} - KRAV: MINST 2 KILDER PER SVAR!
     
     ANTALL KILDER:
     * MINIMUM 2 kilder per svar - dette er et KRAV
     * 3-4 kilder = bra, gir høyere troverdighet
     * 5+ kilder = utmerket for komplekse spørsmål
     * Bare 1 kilde = IKKE AKSEPTABELT (finn flere!)
     
     TYPER KILDER Å KOMBINERE:
     * Lovtekst (§) - hovedkilden, MÅ alltid være med
     * Forarbeider (Prop., Ot.prp., NOU) - for tolkning
     * Rettspraksis (HR-, LA-, LB-dommer) - for anvendelse
     * Forskrifter - når relevant
     * Offentlige veiledere (regjeringen.no, forbrukertilsynet.no)
     
     KRAV FOR HVER CITATION:
     * source_name: Navnet på loven/kilden som FAKTISK støtter påstanden
     * section: EKSAKT paragraf (f.eks. "§ 27 første ledd", ikke bare "§ 27")
     * url: URL fra evidensen som INNEHOLDER denne paragrafen
     
     VERIFIKASJONSSTEG:
     1. Les svaret - hva er påstanden?
     2. Finn MINST 2 steder i evidensen som støtter dette
     3. Verifiser at hver paragraf FAKTISK handler om det svaret sier
     4. Bruk ULIKE paragrafer for ulike påstander i samme svar
     
     EKSEMPEL PÅ GODT SVAR:
     Svar om reklamasjon → citations: [
       { "Forbrukerkjøpsloven", "§ 27 første ledd", url1 },  // Reklamasjonsfrist
       { "Forbrukerkjøpsloven", "§ 27 annet ledd", url1 },   // 2-måneders minstekrav
       { "Prop. 44 L (2021-2022)", "s. 45", url2 }           // Forarbeider om fristen
     ]
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

KRAV TIL ANTALL KILDER:
- MINIMUM 2 kilder per qa_item - dette er OBLIGATORISK
- Hvis du bare finner 1 kilde, SØK HARDERE i evidensen
- Kombiner ulike typer kilder: lovtekst + forarbeider, eller lovtekst + praksis
- Flere relevante kilder = høyere confidence

KONFIDENSREGLER:
- 4+ relevante kilder = "høy"
- 2-3 relevante kilder = "middels"
- 1 kilde eller usikre kilder = "lav"

VERIFISERING (gjør dette for HVER qa_item):
1. Har svaret MINST 2 citations? Hvis nei, finn flere!
2. Støtter HVER citation FAKTISK påstanden i svaret?
3. Er paragrafene SPESIFIKKE nok? (§ 27 første ledd, ikke bare § 27)
4. Kommer kildene fra ULIKE steder i evidensen?

IKKE:
- Godta bare 1 kilde per svar - finn flere!
- Gjenbruk samme paragraf for alle svar
- Siter paragrafer du ikke har sett i evidensen`;

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

  // Post-processing step 1: Clarify vague legal terms
  const clarifiedQaItems = await clarifyVagueLegalTerms(parsed.qa_items || []);
  
  // Post-processing step 2: Add legal reasoning explanation
  const withReasoning = await addLegalReasoning(clarifiedQaItems, faktum, evidenceText);
  
  // Post-processing step 3: Sort in logical legal order (FINAL STEP)
  const sortedQaItems = await sortInLegalOrder(withReasoning);

  return {
    qa_items: sortedQaItems,
    checklist: parsed.checklist || [],
    documentation: parsed.documentation || [],
    sources: parsed.sources || [],
  };
}

// Vague legal terms that need explanation
const VAGUE_TERMS = [
  { term: "rimelig tid", explanation: "I forbrukerkjøp betyr 'rimelig tid' normalt 2-3 måneder, men aldri under 2 måneder fra mangelen ble oppdaget." },
  { term: "vesentlig mangel", explanation: "En mangel er 'vesentlig' når den er så alvorlig at kjøper har god grunn til å si seg løst fra avtalen. Dette vurderes konkret." },
  { term: "uforholdsmessig", explanation: "'Uforholdsmessig' betyr at kostnadene eller ulempene er urimelig store sammenlignet med nytten for den andre parten." },
  { term: "uten ugrunnet opphold", explanation: "Dette betyr at man må handle raskt, normalt innen noen få dager til et par uker." },
  { term: "innen rimelig tid", explanation: "Se 'rimelig tid' - normalt 2-3 måneder i forbrukersaker, kortere i næringssaker." },
  { term: "god tro", explanation: "'God tro' betyr at man verken visste eller burde ha visst om forholdet." },
  { term: "alminnelig kjent", explanation: "Noe er 'alminnelig kjent' når en vanlig person ville kjent til det uten spesiell undersøkelse." },
];

/**
 * Post-processing step: Clarify vague legal terms in answers
 * This runs AFTER the main analysis to ensure concrete answers
 */
async function clarifyVagueLegalTerms(qaItems: QAItem[]): Promise<QAItem[]> {
  const openai = getOpenAI();
  
  // Check if any answers contain vague terms
  const itemsWithVagueTerms = qaItems.filter(item => {
    const answerLower = item.answer.toLowerCase();
    return VAGUE_TERMS.some(vt => answerLower.includes(vt.term));
  });

  if (itemsWithVagueTerms.length === 0) {
    return qaItems;
  }

  // Create clarification prompt
  const prompt = `Du skal gjøre svarene mer KONKRETE ved å forklare vage juridiske begreper.

SVAR SOM INNEHOLDER VAGE BEGREPER:
${itemsWithVagueTerms.map(item => `ID: ${item.id}\nSvar: ${item.answer}`).join('\n\n')}

VAGE BEGREPER SOM MÅ FORKLARES:
${VAGUE_TERMS.map(vt => `- "${vt.term}": ${vt.explanation}`).join('\n')}

For hvert svar som inneholder et vagt begrep:
1. Identifiser det vage begrepet
2. Legg til en KONKRET forklaring i parentes eller som en ekstra setning
3. Gi et TALL eller TIDSRAMME når mulig

Eksempel på forbedring:
FØR: "Du må reklamere innen rimelig tid."
ETTER: "Du må reklamere innen rimelig tid (i forbrukerkjøp betyr dette normalt 2-3 måneder, men aldri under 2 måneder fra du oppdaget mangelen)."

Returner JSON:
{
  "clarified_answers": [
    { "id": "qa1", "answer": "Forbedret svar med forklaring..." }
  ]
}

VIKTIG: Behold resten av svaret uendret - bare legg til forklaringen av det vage begrepet.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Du er en juridisk assistent som gjør vage svar mer konkrete." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const clarified = JSON.parse(response.choices[0]?.message?.content || "{}");
    const clarifiedAnswers = clarified.clarified_answers || [];

    // Merge clarified answers back into original items
    return qaItems.map(item => {
      const clarification = clarifiedAnswers.find((c: { id: string; answer: string }) => c.id === item.id);
      if (clarification) {
        return { ...item, answer: clarification.answer };
      }
      return item;
    });
  } catch (error) {
    console.error("Error clarifying vague terms:", error);
    return qaItems; // Return original if clarification fails
  }
}

/**
 * Post-processing step 2: Add legal reasoning explanation to each answer
 * This explains HOW the AI reasoned and WHY it presented this answer
 */
async function addLegalReasoning(
  qaItems: QAItem[],
  faktum: string,
  evidenceText: string
): Promise<QAItem[]> {
  const openai = getOpenAI();

  const prompt = `Du skal forklare den juridiske tankeprosessen bak hvert svar.

BRUKERENS FAKTUM:
${faktum}

SPØRSMÅL OG SVAR SOM TRENGER DRØFTELSE:
${qaItems.map(item => `
ID: ${item.id}
Spørsmål: ${item.question}
Svar: ${item.answer}
Kilder brukt: ${item.citations.map(c => c.source_name + (c.section ? ' ' + c.section : '')).join(', ')}
`).join('\n---\n')}

For HVERT svar, skriv en kort juridisk drøftelse (3-5 setninger) som forklarer:

1. REGELIDENTIFIKASJON: Hvilken lov/regel ble brukt og hvorfor akkurat denne?
2. TOLKNING: Hvordan ble regelen tolket i denne saken?
3. SUBSUMSJON: Hvordan ble fakta i saken koblet til vilkårene i regelen?
4. KONKLUSJON: Hvorfor ble akkurat denne konklusjonen trukket?

Drøftelsen skal være:
- Pedagogisk og forklarende (som om du lærer bort jussen)
- Konkret knyttet til brukerens faktum
- Vise at svaret er basert på logisk juridisk resonnement

Returner JSON:
{
  "reasonings": [
    { "id": "qa1", "legal_reasoning": "Drøftelse her..." },
    { "id": "qa2", "legal_reasoning": "Drøftelse her..." }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Du er en juridisk pedagog som forklarer juridisk resonnement på en klar og forståelig måte." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    const reasonings = result.reasonings || [];

    // Merge reasonings into qa items
    return qaItems.map(item => {
      const reasoning = reasonings.find((r: { id: string; legal_reasoning: string }) => r.id === item.id);
      return {
        ...item,
        legal_reasoning: reasoning?.legal_reasoning || "Drøftelse ikke tilgjengelig.",
      };
    });
  } catch (error) {
    console.error("Error adding legal reasoning:", error);
    // Return items with default reasoning if it fails
    return qaItems.map(item => ({
      ...item,
      legal_reasoning: "Drøftelse ikke tilgjengelig.",
    }));
  }
}

/**
 * Post-processing step 3 (FINAL): Sort Q&A items in logical legal order
 * The order should follow how a lawyer would analyze a case:
 * 1. Jurisdiction/applicable law (which law applies?)
 * 2. Time limits/deadlines (reklamasjonsfrist, foreldelse)
 * 3. Material conditions (is there a defect/mangel? breach of contract?)
 * 4. Remedies/consequences (what can you claim? beføyelser)
 */
async function sortInLegalOrder(qaItems: QAItem[]): Promise<QAItem[]> {
  if (qaItems.length <= 1) return qaItems;

  const openai = getOpenAI();

  const prompt = `Du skal sortere disse juridiske spørsmålene i LOGISK REKKEFØLGE.

SPØRSMÅL SOM SKAL SORTERES:
${qaItems.map(item => `ID: ${item.id}\nSpørsmål: ${item.question}`).join('\n\n')}

SORTERINGSREGLER (juridisk metode):
1. FØRST: Hvilket rettsområde/lov gjelder? (virkeområde)
2. DERETTER: Er frister overholdt? (reklamasjon, foreldelse, søksmålsfrister)
3. SÅ: Er vilkårene oppfylt? (mangel, mislighold, erstatningsansvar)
4. TIL SLUTT: Hvilke krav/beføyelser kan gjøres gjeldende? (heving, prisavslag, erstatning)

HVORFOR DENNE REKKEFØLGEN:
- Man må vite at loven gjelder FØR man vurderer frister
- Man må være innenfor frister FØR man vurderer om det er mangel
- Man må ha en mangel FØR man kan kreve beføyelser

Returner JSON med sortert rekkefølge:
{
  "sorted_ids": ["id som kommer først", "id som kommer nest", ...],
  "reasoning": "Kort forklaring på hvorfor denne rekkefølgen"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Du er en juridisk ekspert som organiserer analyser i logisk rekkefølge." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    const sortedIds: string[] = result.sorted_ids || [];

    if (sortedIds.length === 0) return qaItems;

    // Sort items according to the AI's ordering
    const sortedItems: QAItem[] = [];
    for (const id of sortedIds) {
      const item = qaItems.find(q => q.id === id);
      if (item) sortedItems.push(item);
    }

    // Add any items that weren't in the sorted list (safety net)
    for (const item of qaItems) {
      if (!sortedItems.find(q => q.id === item.id)) {
        sortedItems.push(item);
      }
    }

    console.log("Sorted Q&A in legal order:", result.reasoning);
    return sortedItems;
  } catch (error) {
    console.error("Error sorting in legal order:", error);
    return qaItems; // Return original order if sorting fails
  }
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
