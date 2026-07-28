# Financial Market Intelligence Tracker: MVP Execution Plan

---

## 1. Core Objective

Build an automated, zero-cost Business Intelligence (BI) pipeline to track strategic pivots, product launches, tech acquisitions, and Key Management Personnel (KMP) movements across 23 global financial institutions and networks. The system will categorize announcements dynamically to highlight the actual use cases and strategies shaping global finance, acting as an early-warning radar for Indian banks.

---

## 2. Non-Negotiable Engineering Principles (Directive for Implementing Agents)

> **This section is a hard constraint, not a suggestion. Any LLM or developer implementing this system must treat these principles as the architectural constitution of the project. Violating them to ship faster or create makeshift fallbacks is strictly prohibited.**

### 2.1 Architectural Integrity & No Mock Bypasses
- **No Makeshift Workarounds:** Under no circumstances should any agent or developer bypass the agreed architecture (Supabase `pgvector` + Gemini + Next.js) by writing static JSON fallback files or mock scripts to make the UI work on a temporary basis.
- **Explicit User Actionables:** If API keys, environment variables, or database tables are missing, the system MUST pause and explicitly ask the user for the required actionables rather than inventing local file fallbacks.

### 2.2 Separation of Concerns (SoC)
Every layer of the pipeline must have **one job and one job only**:
- **Fetcher scripts (`src/fetchers/`):** Fetch raw articles, extract full text HTML, and normalize metadata. Nothing else.
- **Deduplication module (`src/dedup.py`):** Filters net-new articles using title hashes (Pass 1) and Supabase `pgvector` embeddings (Pass 2).
- **LLM Worker (`src/llm.py`):** Takes a clean article, returns a validated `MarketSignal` object using Gemini via `instructor`.
- **Repository (`src/repository.py`):** The ONLY component allowed to write to Supabase `market_signals` and `pipeline_runs`.
- **Frontend (`frontend/`):** Reads strictly from Supabase `market_signals` and `pipeline_runs`.

### 2.3 Modularity & Config-Driven Design
- All source definitions live in `sources.yaml`. No URLs, institution names, or query strings hardcoded in Python.
- Swap-friendly interfaces: Replacing Gemini or Supabase requires changing only its specific module adapter.

### 2.5 Options & Trade-Off Comparison First
- **No Premature Execution on Architectural Choices:** Whenever the user asks a question regarding alternative tools, LLM models, hosting, databases, or trade-offs, the agent MUST present a structured comparison listing Options, Pros, Cons, Rate Limits, and Costs FIRST.
- **Wait for Choice:** The agent must never jump straight into package installation or code mutation until the user selects an option or approves a choice.

### 2.4 Scalability & Stateless Execution
- Every worker component must be stateless.
- Fetcher scripts must be independently runnable per-source (`python src/main.py --source MAS`).

---

## 3. Strict Entity Disambiguation & Full-Text Ingestion Policy

### 3.1 Entity Matching (Zero False Positives)
- **Problem:** Generic keyword matching produces false positives (e.g., tagging JPMorgan Chase or MAS on articles where they are merely mentioned in passing or not involved).
- **Strict Rule:** The LLM extraction contract enforces that an institution is tagged **ONLY IF it is a primary subject, builder, regulator, or active counterparty** in the reported event. Passive or incidental mentions must NOT result in institution linkage.

### 3.2 Full-Text Ingestion & Paywall Policy
- **Full Text Extraction:** RSS feeds often contain only a 2-sentence summary snippet. For open-access feeds, Layer 1 will follow the article URL and extract the full body text using `trafilatura` / `httpx` so Gemini evaluates the complete story context.
- **Hard Paywall Policy:** Sources behind subscription paywalls (e.g., American Banker, WSJ, FT, CB Insights) are **strictly excluded** from direct scraping to avoid ToS violations and incomplete 404 content. The pipeline exclusively targets open-access official newsrooms (MAS, FCA, Fed), press releases, and open trade publications (Finextra, PYMNTS, Payments Dive).

---

## 4. User Actionables Required for Live Operations

For the live end-to-end pipeline to ingest, deduplicate, analyze, and display real-time intelligence via Supabase:

1. **Supabase Schema Setup:**
   - Copy [`db/schema.sql`](file:///Users/priyanshumani/Documents/learning/projects/track23/db/schema.sql) and execute it in your Supabase SQL Editor to enable `pgvector` and create `market_signals` and `pipeline_runs`.
2. **Backend Credentials (`.env` in root):**
   ```env
   SUPABASE_URL=https://<your-supabase-project>.supabase.co
   SUPABASE_KEY=<your-supabase-service-role-key>
   GEMINI_API_KEY=<your-gemini-api-key>
   ```
3. **Frontend Credentials (`frontend/.env.local`):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-supabase-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   ```

---

## 5. Target Coverage Matrix

The ingestion engine will explicitly monitor the following entities:

* **The Challengers:** Revolut, Monzo, Nubank, Starling Bank
* **The Asian Vanguard:** DBS Bank, OCBC Bank, United Overseas Bank (UOB), Standard Chartered, Monetary Authority of Singapore (MAS)
* **The Mega-Banks & Regulators:** JPMorgan Chase, Citigroup, HSBC, MUFG Bank, BBVA, BNP Paribas, Nordea, Financial Conduct Authority (FCA), Federal Reserve / OCC
* **The Payment Rails:** SWIFT, The Clearing House (TCH), Visa, Mastercard, American Express

---

## 6. Architecture & Tech Stack (Zero-Cost, Scalable Setup)

* **Layer 1: Ingestion Pipeline:** Config-driven (`sources.yaml`). Open-access RSS feeds + full HTML article body extraction via `trafilatura`. GDELT as unlimited gap-fill.
* **Layer 2: Deduplication Engine:** Pass 1 Title MD5 hashing (O(1)) → Pass 2 Supabase `pgvector` semantic similarity.
* **Layer 3: Processing Brain:** Gemini (free tier) + `instructor` + Pydantic schema validation (`MarketSignal`). Strict entity disambiguation.
* **Layer 4: Storage & Observability:** Supabase `market_signals` and `pipeline_runs` observability table.
* **Layer 5: Frontend Dashboard:** Next.js on Vercel. Apple HIG Light Theme (`#FFFFFF` clean light background, systematic 8pt/16pt grid layout, no dark mode, working source links).
* **Orchestration:** GitHub Actions cron schedule once per day (`0 2 * * *`) + `workflow_dispatch` manual trigger.

---

## 7. Source Registry & Tiering

### Tier 1 — Regulatory / Primary Official Sources
| Institution(s) | Source | Type | Verified Endpoint |
|---|---|---|---|
| MAS | MAS Official Press Releases | RSS | `https://www.mas.gov.sg/rss/pressreleases` |
| FCA | FCA News | RSS | `https://www.fca.org.uk/news/rss.xml` |
| Federal Reserve / OCC | Federal Reserve Press Releases | RSS | `https://www.federalreserve.gov/feeds/press_all.xml` |
| SWIFT | SWIFT Newsroom | RSS | Monitor `https://www.swift.com/news-events/press-releases` |
| All Mega-Banks | Finextra | RSS | `https://www.finextra.com/rss/headlines.aspx` |

### Tier 2 — Primary Banks & Regional Coverage
| Coverage Zone | Institution(s) | Source | Type | Verified Endpoint |
|---|---|---|---|---|
| Asian Vanguard | DBS, OCBC, UOB, StanChart, MAS | Fintech News Singapore | RSS | `https://fintechnews.sg/feed/` |
| Asian Vanguard | DBS, OCBC, UOB, StanChart | The Asian Banker | RSS | `https://theasianbanker.com/feed` |
| Mega-Banks | BBVA | BBVA Official Blog | RSS | `https://www.bbva.com/en/feed/` |
| Payment Rails | Visa, Mastercard, Amex, SWIFT, TCH | PYMNTS.com | RSS | `https://www.pymnts.com/feed/` |
| Payment Rails | SWIFT, TCH, Instant Payments | Payments Dive | RSS | `https://www.paymentsdive.com/feeds/news/` |
| Payment Rails | B2B, ISO 20022 | The Paypers | RSS | `https://www.thepaypers.com/rss/news.xml` |

### Tier 3 — Challengers (Neobanks)
| Institution(s) | Source | Type | Notes |
|---|---|---|---|
| Revolut, Monzo, Nubank, Starling | Sifted (by FT) | RSS | `https://sifted.eu/feed` |
| Revolut, Monzo, Nubank, Starling | TechCrunch (Fintech) | RSS | `https://techcrunch.com/category/fintech/feed/` |
| Revolut, Monzo, Nubank, Starling | AltFi | RSS | `https://www.altfi.com/feed` |
| Monzo | Monzo Official Blog | RSS | `https://monzo.com/feed.xml` |
| All Challengers | NewsAPI.org | API | Free tier (100 req/day budget) |

---

## 8. Source Configuration Registry (`sources.yaml`)

```yaml
sources:
  - name: "MAS"
    tier: 1
    type: rss
    url: "https://www.mas.gov.sg/rss/pressreleases"
    institutions: ["MAS"]
    enabled: true

  - name: "FCA"
    tier: 1
    type: rss
    url: "https://www.fca.org.uk/news/rss.xml"
    institutions: ["FCA"]
    enabled: true

  - name: "Federal Reserve"
    tier: 1
    type: rss
    url: "https://www.federalreserve.gov/feeds/press_all.xml"
    institutions: ["Federal Reserve", "OCC"]
    enabled: true

  - name: "Finextra"
    tier: 1
    type: rss
    url: "https://www.finextra.com/rss/headlines.aspx"
    institutions: ["JPMorgan Chase", "Citigroup", "HSBC", "MUFG", "BBVA", "BNP Paribas", "Nordea", "SWIFT", "Visa", "Mastercard"]
    enabled: true

  - name: "Fintech News Singapore"
    tier: 2
    type: rss
    url: "https://fintechnews.sg/feed/"
    institutions: ["DBS", "OCBC", "UOB", "Standard Chartered", "MAS"]
    enabled: true

  - name: "PYMNTS"
    tier: 2
    type: rss
    url: "https://www.pymnts.com/feed/"
    institutions: ["Visa", "Mastercard", "American Express", "SWIFT", "TCH"]
    enabled: true

  - name: "Payments Dive"
    tier: 2
    type: rss
    url: "https://www.paymentsdive.com/feeds/news/"
    institutions: ["SWIFT", "TCH", "Visa", "Mastercard"]
    enabled: true

  - name: "Sifted"
    tier: 3
    type: rss
    url: "https://sifted.eu/feed"
    institutions: ["Revolut", "Monzo", "Nubank", "Starling Bank"]
    enabled: true
```

---

## 9. AI Processing Logic & Pydantic Contract

```python
from pydantic import BaseModel, HttpUrl
from typing import Literal
from datetime import datetime

INSTITUTIONS = Literal[
    "Revolut", "Monzo", "Nubank", "Starling Bank",
    "DBS", "OCBC", "UOB", "Standard Chartered", "MAS",
    "JPMorgan Chase", "Citigroup", "HSBC", "MUFG", "BBVA",
    "BNP Paribas", "Nordea", "FCA", "Federal Reserve", "OCC",
    "SWIFT", "TCH", "Visa", "Mastercard", "American Express"
]

EVENT_TYPES = Literal[
    "Product Launch", "Investment/M&A", "Strategic Pivot",
    "KMP Hire", "Regulatory Action", "Partnership", "Technology Adoption"
]

class MarketSignal(BaseModel):
    institution: INSTITUTIONS     # Strictly primary participant only - zero false positive tagging
    event_type: EVENT_TYPES
    so_what: str                  # 2-4 sentences. Analytical. No fluff.
    technologies: list[str]       # Specific named technologies only
    source_url: HttpUrl
    source_name: str
    source_tier: Literal[1, 2, 3]
    published_at: datetime
    raw_title: str
```

---

## 10. Execution Plan

1. **User Actionables Check:** Prompt the user for Supabase credentials (`SUPABASE_URL`, `SUPABASE_KEY`) and Gemini API Key (`GEMINI_API_KEY`).
2. **Supabase Schema Run:** User executes `db/schema.sql` in Supabase SQL Editor.
3. **Full-Text Ingestion Setup:** Add `trafilatura` full-text HTML body extractor to `src/fetchers/rss.py` so Gemini reads complete articles instead of 2-sentence RSS snippets.
4. **Strict Disambiguation:** Update Gemini system prompt in `src/llm.py` to enforce zero false-positive institution linkage.
5. **Live Ingestion Run:** Execute `python src/main.py` to populate Supabase `market_signals` and `pipeline_runs`.
6. **Frontend Integration:** Wire `frontend/src/lib/supabase.ts` directly to Supabase (`market_signals` and `pipeline_runs`). Zero mock fallback files.
