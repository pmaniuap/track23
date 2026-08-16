# Track23: Architecture & Product Summary
**Date:** August 16, 2026

## Overview
**Track23** is a Financial Market Intelligence Tracker that monitors 24 global institutions across Regulators, Banks, Payment Rails, and Challengers.

## 1. What is Built
* **Automated Data Pipeline:** A Python backend that fetches raw news from financial RSS feeds.
* **LLM-Powered Processing:** Uses the Groq API to deduplicate and categorize news into structured signals.
* **Live Dashboard:** A Next.js web application with a pipeline health banner, advanced filtering, and interactive signal cards.
* **Automation:** The pipeline runs via GitHub Actions every 48 hours, and the frontend is hosted on Vercel.

## 2. Technology Stack
* **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS.
* **Backend Pipeline:** Python, Feedparser, Groq (LLM API).
* **Database:** Supabase (PostgreSQL).

## 3. Key Architectural Decisions
* **Decoupled Architecture:** The Next.js frontend and Python backend communicate solely through the Supabase database.
* **Zero-Maintenance Automation:** A GitHub Actions cron job triggers the data pipeline every 48 hours, avoiding the need for a dedicated server.
* **Serverless Database Fetching:** The frontend uses the Supabase client with an Anonymous API Key to fetch data directly from the browser.
* **Structured LLM Extraction:** Groq enforces a strict JSON schema to categorize news into predefined types, ensuring data consistency for frontend filters.
* **Static Fallback:** If the database connection fails, the UI gracefully falls back to a static JSON file to prevent the site from breaking.

## 4. Coverage (Entities & Event Types)
**Categories (4):** Regulator, Bank, Payment Rails, Challenger
**Event Types (7):** Product Launch, Investment/M&A, Strategic Pivot, KMP Hire, Regulatory Action, Partnership, Technology Adoption

**Monitored Institutions (24):**
* **Regulators:** MAS, FCA, Federal Reserve, OCC
* **Banks:** JPMorgan Chase, Citigroup, HSBC, DBS, OCBC, UOB, Standard Chartered, MUFG, BBVA, BNP Paribas, Nordea
* **Payment Rails:** SWIFT, TCH, Visa, Mastercard, American Express
* **Challengers:** Revolut, Monzo, Nubank, Starling Bank

## 5. Root Directory Structure
* `.env` / `.env.example`: Environment variables for API keys and database URLs.
* `.github/`: Contains the `pipeline.yml` GitHub Actions workflow for the 48-hour cron job.
* `db/`: Database schema definitions for Supabase.
* `frontend/`: The Next.js web application (React, TypeScript, Tailwind).
* `requirements.txt`: Python package dependencies.
* `sources.yaml`: Configuration file listing all target RSS feed URLs.
* `src/`: The Python backend pipeline source code (contains `main.py` and logic).
* `tests/`: Unit tests for the Python backend pipeline.
* `Financial_Intelligence_Tracker_MVP_Plan.md`: The initial project plan and requirements document.
