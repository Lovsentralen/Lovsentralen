# Lovsentralen - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Auth UI    │  │  Faktum Form │  │ Clarifications│  │  Results View   │ │
│  │  (Login/     │  │  (Submit     │  │  (Q&A Flow)   │  │  (10 Q&As +     │ │
│  │   Register)  │  │   faktum)    │  │               │  │   Citations)    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  └────────┬────────┘ │
│         │                 │                 │                     │          │
│         └─────────────────┴─────────────────┴─────────────────────┘          │
│                                     │                                        │
│                          API Route Calls                                     │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Next.js API Routes)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         LEGAL ANALYSIS PIPELINE                          ││
│  │                                                                          ││
│  │  1. Issue Extraction                                                     ││
│  │     └─► Parse faktum + clarifications → JSON legal issues               ││
│  │                                                                          ││
│  │  2. Search Query Planning                                                ││
│  │     └─► Generate 2-4 Norwegian search queries per issue                 ││
│  │                                                                          ││
│  │  3. Google Search (Programmable Search API)                             ││
│  │     └─► Execute queries → Deduplicate results                           ││
│  │                                                                          ││
│  │  4. Page Fetch & Parse                                                  ││
│  │     └─► Fetch URLs → Extract main content → Detect § sections           ││
│  │                                                                          ││
│  │  5. Evidence Selection                                                  ││
│  │     └─► Select 3-8 high-signal excerpts per issue                       ││
│  │                                                                          ││
│  │  6. Grounded Answer Generation (OpenAI/Anthropic)                       ││
│  │     └─► Generate 10 Q&As with citations                                 ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Auth Service   │  │  Case Service   │  │  PDF Export Service         │  │
│  │  (Supabase)     │  │  (CRUD)         │  │  (Generate reports)         │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────────────────┘  │
│           │                    │                                             │
└───────────┴────────────────────┴─────────────────────────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                          PostgreSQL Database                          │   │
│  │                                                                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────┐  ┌─────────────────┐  │   │
│  │  │ profiles │  │  cases   │  │clarifications │  │    results      │  │   │
│  │  │          │  │          │  │               │  │                 │  │   │
│  │  │ user_id  │◄─┤ user_id  │  │ case_id       │  │ case_id         │  │   │
│  │  │ created  │  │ faktum   │◄─┤ question      │  │ qa_json         │  │   │
│  │  │          │  │ category │  │ user_answer   │  │ checklist_json  │  │   │
│  │  └──────────┘  └────┬─────┘  └───────────────┘  └─────────────────┘  │   │
│  │                     │                                                │   │
│  │                     ▼                                                │   │
│  │               ┌──────────┐                                           │   │
│  │               │ evidence │                                           │   │
│  │               │          │                                           │   │
│  │               │ case_id  │                                           │   │
│  │               │ source   │                                           │   │
│  │               │ url      │                                           │   │
│  │               │ excerpt  │                                           │   │
│  │               │ section  │                                           │   │
│  │               └──────────┘                                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌───────────────────────────┐                                              │
│  │     Authentication        │                                              │
│  │  - Email/Password         │                                              │
│  │  - Magic Link             │                                              │
│  │  - Session Management     │                                              │
│  └───────────────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              EXTERNAL SERVICES
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │  Google Programmable      │  │        AI Provider                     │  │
│  │  Search API               │  │        (OpenAI / Anthropic)            │  │
│  │                           │  │                                        │  │
│  │  - Search Norwegian       │  │  - Issue extraction                    │  │
│  │    legal sources          │  │  - Clarifying questions                │  │
│  │  - Return ranked URLs     │  │  - Grounded answer generation          │  │
│  │                           │  │  - Quality ranking                     │  │
│  └───────────────────────────┘  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### User Submits Faktum

```
User Input (faktum text + category)
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Create Case Record               │
│    - Store in Supabase              │
│    - Generate case_id               │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 2. Generate Clarifying Questions    │
│    - AI analyzes faktum             │
│    - Produces 3-7 questions         │
│    - Store questions in DB          │
└────────────────┬────────────────────┘
                 │
                 ▼
        [User Answers Questions]
                 │
                 ▼
┌─────────────────────────────────────┐
│ 3. Issue Extraction                 │
│    - Faktum + answers → JSON        │
│    - List of legal issues           │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 4. Search Query Planning            │
│    - 2-4 queries per issue          │
│    - Norwegian keywords             │
│    - Include "lovdata", "§", etc.   │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 5. Google Search Execution          │
│    - Call Programmable Search API   │
│    - Collect top results            │
│    - Deduplicate by URL/domain      │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 6. Page Fetching                    │
│    - Fetch each URL server-side     │
│    - Parse HTML → extract text      │
│    - Detect § sections/headings     │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 7. Evidence Selection               │
│    - AI ranks relevance             │
│    - Select 3-8 excerpts per issue  │
│    - Store evidence in DB           │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 8. Grounded Answer Generation       │
│    - Generate 10 Q&As               │
│    - Each must cite evidence        │
│    - Add confidence + assumptions   │
│    - Generate checklist             │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 9. Store & Return Results           │
│    - Save to results table          │
│    - Return to frontend             │
│    - Display with citations         │
└─────────────────────────────────────┘
```

## Source Priority Ranking

```
PRIORITY 1 (Primary Legal Sources)
├── Lovdata.no
├── regjeringen.no
├── Stortinget.no
└── domstol.no

PRIORITY 2 (Government Authorities)
├── Forbrukertilsynet.no
├── Forbrukerrådet.no
├── Arbeidstilsynet.no
├── Datatilsynet.no
├── Skatteetaten.no
└── nav.no

PRIORITY 3 (Recognized Legal Guidance)
├── Public agencies
└── Official consumer/legal bodies

PRIORITY 4 (Unofficial - Label Required)
└── Other sources (marked as "uoffisiell kilde")
```

## Technology Stack

| Component  | Technology                                     |
| ---------- | ---------------------------------------------- |
| Frontend   | Next.js 14 + React 18 + TypeScript             |
| Styling    | Tailwind CSS                                   |
| Backend    | Next.js API Routes                             |
| Database   | Supabase (PostgreSQL)                          |
| Auth       | Supabase Auth                                  |
| Search     | Google Programmable Search API                 |
| AI         | OpenAI GPT-4                                   |
| PDF Export | Text-based (upgradable to @react-pdf/renderer) |

## Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Search
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_ENGINE_ID=

# AI Provider
OPENAI_API_KEY=
```

## API Endpoints

| Endpoint                         | Method | Description                |
| -------------------------------- | ------ | -------------------------- |
| `/api/cases`                     | POST   | Create new case            |
| `/api/cases`                     | GET    | List user's cases          |
| `/api/cases/[id]`                | GET    | Get case details           |
| `/api/cases/[id]`                | DELETE | Delete case                |
| `/api/cases/[id]/clarifications` | PUT    | Save clarification answers |
| `/api/cases/[id]/analyze`        | POST   | Start legal analysis       |
| `/api/cases/[id]/export`         | GET    | Export case as report      |
| `/api/auth/signout`              | POST   | Sign out user              |
