# Track23 Progress Summary (August 16, 2026 - August 27, 2026)

### 1. Frontend UI/UX Polish & HIG Alignment
* **Design System Updates (Aug 19):** Refined the frontend layout, headers, filter bars, and empty states to align with Apple's Human Interface Guidelines (HIG). This gave the dashboard a much more premium, native feel.
* **Component Optimization:** Streamlined `EmptyState.tsx`, `FilterBar.tsx`, `Header.tsx`, and `PipelineHealthBanner.tsx` for better visual hierarchy and spacing.

### 2. Vercel Deployment & Build Crash Fixes
* **Resolved Turbopack Crashes:** Fixed an issue where the Vercel production build was failing due to Turbopack limitations by overriding the `build` script in `frontend/package.json` to strictly use Webpack (`next build --webpack`).
* **Fixed Module Import Errors:** Resolved a `js-yaml` typing and import error in `actions.ts` that was preventing the Next.js app from building successfully.

### 3. Live Site Data Rendering Fixes
* **Vercel Serverless File Tracing Fix:** Addressed a critical bug where Vercel was unable to read `sources.yaml` at runtime (which caused all news sources to erroneously fall back to Tier 3). 
* **Automated Static Compilation:** Created a `frontend/prebuild.js` script that dynamically converts `sources.yaml` into `sources.json` right before Vercel builds the app. The frontend now statically imports the JSON, ensuring 100% reliable tier rendering on the live site without manual updates.

### 4. Health Dashboard Implementation
* **Pipeline Monitoring:** Created a brand new `/health` dashboard (`frontend/src/app/health/page.tsx`) to track the efficiency of the backend web scrapers.
* **Metrics Tracking:** The dashboard now lists all news sources and compares `Articles Fetched` versus `Articles Written`, helping us identify noise ratios and coverage gaps.

### 5. Source Quality Tiering & Market Expansion
* **Indian Market Coverage Expansion:** Added comprehensive tracking for Indian financial institutions and fintechs, including the RBI, major domestic banks (HDFC, SBI, Axis, IDFC FIRST, AU Small Finance), payments infrastructure (NPCI, UPI, BBPS), and prominent challengers (PhonePe, Razorpay, Paytm, CRED).
* **Tier Definition Correction:** Renamed the tiers on the Health dashboard to accurately reflect *Source Quality* rather than institution categories:
  * **Tier 1:** Highest Quality (Ground Truth/Regulators)
  * **Tier 2:** Medium Quality (Official Organisation Feeds)
  * **Tier 3:** Lower Quality/General (General News & Aggregators)
* **YAML Hierarchy Reorganization:** Reordered the `sources.yaml` file so official feeds (like the Revolut Blog) moved up to Tier 2, while general news aggregators (like Finextra, Economic Times, and PYMNTS) moved down to Tier 3.

### 6. Backend LLM & Pipeline Resilience
* **Two-Stage LLM Gate:** Implemented a two-stage LLM pipeline architecture in `src/llm.py` (a lightweight triage stage followed by a deep extraction stage) to drastically optimize API costs and improve data quality.
* **Database Cleaning:** Created `src/scripts/clean_junk_signals.py` to allow retroactive cleaning and purging of noisy/junk signals that bypassed earlier filters.
* **Smart Rate Limit Handling:** Enhanced `src/llm.py` to gracefully handle Groq API limitations. Added smart retries with exponential backoff for Requests-Per-Minute (TPM) limits, and automatic fallback to a lighter 20B model if the Daily-Tokens-Per-Day (TPD) limit is hit.
* **Cron Optimization:** Tested the GitHub Actions scraping pipeline (`pipeline.yml`) to ensure it runs correctly, and securely reverted its schedule back to every 48 hours to preserve free-tier compute limits.

### 7. System & Agent Protocol Guardrails
* **Strict Behavioral Rules:** Added permanent guardrails to `.agents/AGENTS.md` ensuring that the AI will *never* alter core product logic, cron schedules, or data policies without explicit permission first.
