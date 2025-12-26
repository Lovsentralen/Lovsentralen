// Database Types
export interface Profile {
  id: string;
  user_id: string;
  created_at: string;
}

export interface Case {
  id: string;
  user_id: string;
  faktum_text: string;
  category: LegalCategory | null;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
}

export interface Clarification {
  id: string;
  case_id: string;
  question: string;
  user_answer: string | null;
  order_index: number;
  created_at: string;
}

export interface Result {
  id: string;
  case_id: string;
  qa_json: QAItem[];
  checklist_json: ChecklistItem[];
  documentation_json: DocumentationItem[];
  sources_json: LegalSource[];
  created_at: string;
}

export interface Evidence {
  id: string;
  case_id: string;
  source_name: string;
  url: string;
  title: string;
  excerpt: string;
  section_hint: string | null;
  source_priority: SourcePriority;
  retrieved_at: string;
}

// Enums
export type LegalCategory =
  | "forbrukerkjop"
  | "husleie"
  | "arbeidsrett"
  | "personvern"
  | "kontrakt"
  | "erstatning";

export type CaseStatus =
  | "draft"
  | "clarifying"
  | "analyzing"
  | "completed"
  | "error";

export type SourcePriority = 1 | 2 | 3 | 4;

export type ConfidenceLevel = "lav" | "middels" | "høy";

// UI Types
export interface QAItem {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  confidence: ConfidenceLevel;
  assumptions: string[];
  missing_facts: string[];
  relevance: number; // 1-10 score for how relevant this Q&A is to the user's specific case
  relevance_reason: string; // Brief explanation of why this Q&A is relevant to the user's specific situation
  legal_reasoning: string; // Detailed explanation of AI's legal reasoning process
}

export interface Citation {
  source_name: string;
  section: string | null;
  url: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  priority: "høy" | "middels" | "lav";
  completed: boolean;
}

export interface DocumentationItem {
  id: string;
  text: string;
  reason: string;
}

export interface LegalSource {
  name: string;
  url: string;
  description: string;
  priority: SourcePriority;
}

// Legal Issue Types
export interface LegalIssue {
  issue: string;
  domain: string;
}

export interface SearchQuery {
  issue: string;
  queries: string[];
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  displayLink: string;
}

export interface ParsedPage {
  url: string;
  title: string;
  content: string;
  sections: PageSection[];
  source_priority: SourcePriority;
  isRepealed: boolean;
  repealedReason?: string;
}

export interface PageSection {
  heading: string;
  content: string;
  section_number: string | null;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface ClarificationResponse {
  questions: string[];
}

export interface AnalysisResponse {
  qa_items: QAItem[];
  checklist: ChecklistItem[];
  documentation: DocumentationItem[];
  sources: LegalSource[];
}

// Category Labels
export const CATEGORY_LABELS: Record<LegalCategory, string> = {
  forbrukerkjop: "Forbrukerkjøp",
  husleie: "Husleie",
  arbeidsrett: "Arbeidsrett",
  personvern: "Personvern",
  kontrakt: "Kontrakt",
  erstatning: "Erstatning",
};

export const SENSITIVE_TOPICS = [
  "straffesak",
  "kriminell",
  "politi",
  "anmeldelse",
  "immigrasjon",
  "utlending",
  "oppholdstillatelse",
  "barnevern",
  "barn",
  "foreldreansvar",
  "samvær",
  "oppsigelse",
  "avskjed",
  "mobbing",
  "trakassering",
];

export const ESCALATION_MESSAGE = `
⚠️ **Viktig:** Basert på informasjonen du har oppgitt, ser dette ut til å være en alvorlig sak som kan kreve profesjonell juridisk bistand.

Vi anbefaler sterkt at du kontakter en advokat for personlig rådgivning. Du kan finne advokater via:
- [Advokatforeningen](https://advokatenhjelperdeg.no/)
- [Fri rettshjelp](https://www.domstol.no/fri-rettshjelp/)

Informasjonen under er kun ment som generell veiledning og erstatter ikke juridisk rådgivning.
`;
