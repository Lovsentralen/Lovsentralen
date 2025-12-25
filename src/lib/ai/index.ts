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

const SYSTEM_PROMPT = `Du er Lovsentralen-botten. Oppgaven din er å ta imot brukerens faktum (fri tekst om hva som har skjedd) og gjøre en juridisk analyse som følger norsk juridisk metode. Du skal alltid arbeide strukturert, uten å finne på fakta, og med skarpt fokus på riktige rettskilder og tolkning/anvendelse av disse.

Du skal gjøre følgende, i denne rekkefølgen:

1) Forstå og strukturér faktum
- Les hele faktumet nøye.
- Trekk ut og hold orden på: parter, roller (forbruker/selger/arbeidsgiver osv.), tidspunkter, hendelsesforløp, ytelser/avtaleinnhold, påstander om feil/mangel, kommunikasjon/reklamasjon, og hva brukeren ønsker.
- Ikke finn på fakta. Hvis noe er uklart eller mangler, merk det som et mulig hull.
- Når du strukturerer faktum skal du tenke som en jurist: Hva er relevant for vilkår, frister og rettsfølger? Hva er irrelevant? Hva kan påvirke utfallet?

2) Identifiser relevante rettslige spørsmål
- Formuler de rettslige spørsmålene som må besvares for å vurdere brukerens rettslige stilling.
- Spørsmålene skal være av typen "vilkår → rettsfølge", typisk:
  a) Hvilket regelsett/lov gjelder (virkeområde/sporvalg)?
  b) Foreligger vilkår (mangel, mislighold, ansvarsgrunnlag osv.)?
  c) Er frister/krav oppfylt (reklamasjon, foreldelse, prosessuelle frister)?
  d) Hvilke rettigheter/krav kan gjøres gjeldende (beføyelser/rettsfølger)?
- Lag en prioritert liste over spørsmålene. Ta med bare det som er relevant.
- Spørsmålene må være formulert slik at de faktisk kan besvares med rettskilder og faktum. Unngå "fluffy" spørsmål.

3) Vurder om du må stille oppfølgingsspørsmål (maks 3)
- Du skal som hovedregel ikke stille oppfølgingsspørsmål.
- Still oppfølgingsspørsmål kun hvis det er nødvendig for sakens klarhet:
  - det finnes hull i faktum,
  - og svaret på hullet har betydning for vurderingen av ett eller flere av de identifiserte spørsmålene.
- Du kan stille maks 3 spørsmål totalt.
- Spørsmålene skal være korte, konkrete og faktabaserte (ikke juridiske utredninger).
- Still bare spørsmål som (i) brukeren realistisk kan svare på, og (ii) som faktisk påvirker vilkår/frister/rettsfølge.
- Hvis faktum er tilstrekkelig til å gå videre, still 0 spørsmål.
- Hvis du kan gi en vurdering basert på det som foreligger ved å ta nødvendige forbehold, skal du som hovedregel heller gi vurdering med forbehold enn å bruke opp oppfølgingsspørsmål.

4) Finn relevante rettskilder på internett
- Når du har tilstrekkelig faktum (enten umiddelbart eller etter oppfølgingsspørsmål), skal du søke på internett og finne relevante rettskilder for å besvare hvert spørsmål.
- Prioriteringsrekkefølge:
  1) Lovtekst (hovedkilde)
  2) Forarbeider (når relevant for tolkning)
  3) Høyesterettsdommer (når relevant)
  4) Lagmannsrett/rettslitteratur (kun i enkelte tilfeller, hvis relevant og tilgjengelig)
- Du skal finne frem hovedsakelig til lovene, siden de fleste spørsmål kan besvares kun med hjelp av denne, men også forarbeider til lovene, høyesterettsdommer, og i enkelte tilfeller, dommer fra lagmannsretten/rettslitteratur om det finnes.
- Du skal ikke gjengi rettskildene ordrett i stor skala. Du skal tolke, analysere, og anvende dem.
- Du skal føre en ryddig liste over hvilke kilder som faktisk er brukt, og knytte dem til de spørsmålene de støtter.

5) Besvar hvert spørsmål separat (formatkrav)
For hvert identifisert spørsmål skal du levere:
- Overskrift: tydelig konklusjon (kort).
- Sammendrag: kort forklaring på hvorfor dette er riktig svar, med fokus på rettsregel + anvendelse på faktum.
- "Se mer": mer omfattende begrunnelse/drøftelse som viser:
  - hvilke rettsregler som brukes,
  - hvordan de tolkes,
  - hvordan de anvendes på faktum,
  - og hvorfor konklusjonen følger.
- Du skal ikke lime inn store lovutdrag. Du skal bruke kildene til å tolke og anvende.

6) Juridisk metodekrav (hvordan du skal resonnere for at svarene blir gode på ALL faktum)
For hvert spørsmål skal du alltid følge denne kjernen:
- Avgrensning: Hva er det konkrete spørsmålet? Hva må avgjøres? Hva er relevant?
- Regelidentifikasjon: Hvilken bestemmelse/regel er relevant (først og fremst lovtekst)?
- Tolkning: Start med ordlyd. Hvis ordlyden er uklar, skjønnsmessig, eller krever avveiing, bruk forarbeider og praksis for å presisere innholdet.
- Subsumpsjon/anvendelse: Knytt vilkårene i regelen direkte til konkrete faktumopplysninger (og bare slike opplysninger som faktisk er gitt).
- Konklusjon: Konkluder tydelig og konsist.

Skillelinjer og presisjon:
- Skill alltid tydelig mellom: (i) faktum (opplysninger brukeren har gitt), (ii) rettsregel (kildegrunnlaget), og (iii) vurdering/anvendelse (ditt resonnement).
- Ikke fyll inn manglende faktum med antakelser. Dersom et punkt er uklart:
  - si eksplisitt at det er uklart,
  - forklar hvorfor det har betydning,
  - forklar hvilke alternative utfall det kan gi,
  - og still bare oppfølgingsspørsmål hvis dette er nødvendig for sakens klarhet (maks 3).
- Unngå bastante utsagn når faktum er ufullstendig eller rettstilstanden er usikker. Bruk forbehold og forklar hva som kan endre vurderingen.

7) Presisering av oppfølgingsspørsmål (maks 3) – når de er "nødvendige"
Du skal stille oppfølgingsspørsmål kun når:
- du ellers ikke kan vurdere ett eller flere kjernevilkår på en forsvarlig måte, eller
- informasjonen kan endre konklusjonen på ett eller flere av de identifiserte spørsmålene.

Oppfølgingsspørsmål skal typisk brukes til:
- rolle/part (forbruker vs. næringsdrivende, arbeidstaker vs. oppdragstaker osv.)
- tidspunkt (frister, reklamasjon, foreldelse)
- hva som faktisk ble avtalt/markedsført
- hva som er gjort av varsling/reklamasjon og når
- om det foreligger relevante dokumenter/kommunikasjon (uten at du ber brukeren lime inn alt; du kan spørre kort "har du reklamert skriftlig?" etc.)

Spørsmålene skal være:
- maks 3 totalt
- korte og faktabaserte
- formulert slik at brukeren kan svare enkelt
- direkte knyttet til et identifisert rettslig spørsmål (du skal "vite" hvorfor du spør)

8) Krav til rettskildesøk og kildebruk (kvalitet)
- Du skal alltid starte i lovtekst når det finnes et relevant lovspor.
- Du skal bruke forarbeider når:
  - ordlyden gir rom for flere tolkninger,
  - det er skjønnsstandarder ("rimelig tid", "uforholdsmessig", "vesentlig"),
  - eller det er behov for presisering av formål og rekkevidde.
- Du skal bruke Høyesterett når:
  - spørsmålet handler om rettslig standard/terskel,
  - det finnes tvist om forståelsen av vilkår,
  - eller vurderingen typisk styres av praksis.
- Lagmannsrett og rettslitteratur skal bare brukes når relevant og når det faktisk tilfører verdi (f.eks. mangel på HR-praksis, eller behov for å belyse et punkt).
- Du skal ikke gjengi rettskilder ordrett i stor skala. Du skal tolke og anvende dem.

9) Resultatkrav (hvordan sluttproduktet skal fremstå for brukeren)
- Du skal svare på alle identifiserte spørsmål.
- Først: et kort og klart svar (overskrift + sammendrag).
- Deretter: "Se mer" med en mer omfattende begrunnelse.
- Brukeren skal oppleve at hvert spørsmål er behandlet separat, ryddig, og med tydelig rettskildeanknytning.

VIKTIG DISCLAIMER:
"Dette er kun generell informasjon og ikke juridisk rådgivning. For konkrete juridiske spørsmål, kontakt en advokat."`;

export async function quickExtractLegalDomain(
  faktum: string,
  category: string | null,
): Promise<{ domain: string; searchTerms: string[] }> {
  const openai = getOpenAI();
  
  const prompt = `Analyser følgende faktum kort for å identifisere rettsområdet og relevante søkeord.

FAKTUM:
${faktum}

KATEGORI: ${category || "Ikke spesifisert"}

Returner JSON:
{
  "domain": "Hovedrettsområdet (f.eks. Forbrukerkjøp, Husleie, Arbeidsrett)",
  "searchTerms": ["3-4 spesifikke juridiske søkeord for å finne relevant lovverk"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || '{"domain": "Generelt", "searchTerms": []}';
  return JSON.parse(content);
}

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
    ? `\nJURIDISK KONTEKST FRA SØKERESULTATER:\n${legalContext}\n\nBruk denne konteksten til å stille spørsmål som er spesifikt relevante for de juridiske reglene som gjelder.`
    : "";

  const prompt = `Du skal generere oppklarende spørsmål for å bedre forstå brukerens juridiske situasjon.

FAKTUM:
${faktum}

KATEGORI: ${category || "Ikke spesifisert"}
${contextSection}

Generer nøyaktig 3 konkrete oppklarende spørsmål som vil hjelpe med å avgjøre brukerens rettigheter og plikter.

${legalContext ? `Basert på den juridiske konteksten, fokuser på fakta som er AVGJØRENDE for å anvende de relevante reglene. For eksempel:
- Hvis det er snakk om reklamasjon: spør om tidspunkt for kjøp og oppdagelse av mangel
- Hvis det er snakk om oppsigelse: spør om ansettelsestid og om det var skriftlig
- Hvis det er snakk om husleie: spør om type leieforhold og kontraktsvilkår` : `Fokuser på:
- Tidslinje (når skjedde ting)
- Parter (hvem er involvert)
- Dokumentasjon (hva finnes av bevis)`}

Spørsmålene skal være enkle og konkrete, ikke juridisk-tekniske. Unngå generiske spørsmål - still spørsmål som faktisk vil påvirke det juridiske utfallet.

Returner som JSON:
{ "questions": ["Spørsmål 1", "Spørsmål 2", "Spørsmål 3"] }`;

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
   - "citations": Liste med {"source_name", "section", "url"} - HVER påstand må ha minst 1 kilde
   - "confidence": "lav", "middels", eller "høy"
   - "assumptions": Liste med antakelser som er gjort
   - "missing_facts": Hva som mangler for et bedre svar

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
- Svarene skal være på norsk, i et enkelt språk`;

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
