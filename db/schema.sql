-- ==========================================================
-- Financial Market Intelligence Tracker: Supabase Schema
-- ==========================================================

-- 1. Enable pgvector extension for semantic similarity deduplication
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Market Signals Table (Stores structured LLM outputs and vector embeddings)
CREATE TABLE IF NOT EXISTS market_signals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url      TEXT UNIQUE NOT NULL,
    institution     TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    so_what         TEXT NOT NULL,
    technologies    TEXT[] DEFAULT '{}',
    source_name     TEXT NOT NULL,
    source_tier     INT NOT NULL CHECK (source_tier IN (1, 2, 3)),
    raw_title       TEXT NOT NULL,
    title_hash      TEXT NOT NULL,
    embedding       vector(768), -- Gemini text-embedding-004 vectors (768 dimensions)
    published_at    TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Performance & Query Indexes for Dashboard Filtering
CREATE INDEX IF NOT EXISTS idx_market_signals_institution ON market_signals(institution);
CREATE INDEX IF NOT EXISTS idx_market_signals_event_type ON market_signals(event_type);
CREATE INDEX IF NOT EXISTS idx_market_signals_source_tier ON market_signals(source_tier);
CREATE INDEX IF NOT EXISTS idx_market_signals_published_at ON market_signals(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_signals_title_hash ON market_signals(title_hash);

-- Cosine Distance Vector Index for Deduplication
CREATE INDEX IF NOT EXISTS idx_market_signals_embedding 
ON market_signals USING hnsw (embedding vector_cosine_ops);

-- 3. Pipeline Runs Table (Observability & Health Monitoring)
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id                TEXT NOT NULL,
    source_name           TEXT NOT NULL,
    run_at                TIMESTAMPTZ DEFAULT now(),
    articles_fetched      INT DEFAULT 0,
    articles_deduplicated INT DEFAULT 0,
    articles_processed    INT DEFAULT 0,
    articles_written      INT DEFAULT 0,
    status                TEXT CHECK (status IN ('success', 'partial', 'failed')),
    error_message         TEXT
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_run_id ON pipeline_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_run_at ON pipeline_runs(run_at DESC);

-- RPC Function for Similarity Search during Pass 2 Deduplication
CREATE OR REPLACE FUNCTION match_signals (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  raw_title TEXT,
  source_url TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    market_signals.id,
    market_signals.raw_title,
    market_signals.source_url,
    1 - (market_signals.embedding <=> query_embedding) AS similarity
  FROM market_signals
  WHERE 1 - (market_signals.embedding <=> query_embedding) > match_threshold
  ORDER BY market_signals.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
