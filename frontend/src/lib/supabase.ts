import { createClient } from '@supabase/supabase-js';
import { MarketSignal, PipelineRun } from '../types';
import liveSignalsData from './liveSignals.json';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isLiveSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isLiveSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const REAL_LIVE_SIGNALS: MarketSignal[] = liveSignalsData as MarketSignal[];

export const SAMPLE_RUNS: PipelineRun[] = [
  {
    id: 'run-live-1',
    run_id: 'c9f82a',
    source_name: 'Finextra',
    run_at: new Date().toISOString(),
    articles_fetched: 51,
    articles_deduplicated: 15,
    articles_processed: 36,
    articles_written: 36,
    status: 'success',
  },
  {
    id: 'run-live-2',
    run_id: 'c9f82a',
    source_name: 'FCA UK',
    run_at: new Date().toISOString(),
    articles_fetched: 20,
    articles_deduplicated: 0,
    articles_processed: 20,
    articles_written: 20,
    status: 'success',
  },
  {
    id: 'run-live-3',
    run_id: 'c9f82a',
    source_name: 'Federal Reserve',
    run_at: new Date().toISOString(),
    articles_fetched: 20,
    articles_deduplicated: 0,
    articles_processed: 20,
    articles_written: 20,
    status: 'success',
  },
];

export async function fetchMarketSignals(): Promise<{
  data: MarketSignal[];
  isLive: boolean;
}> {
  if (!supabase) {
    return { data: REAL_LIVE_SIGNALS, isLive: false };
  }

  try {
    const { data, error } = await supabase
      .from('market_signals')
      .select('*')
      .order('published_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return { data: REAL_LIVE_SIGNALS, isLive: false };
    }

    return { data: data as MarketSignal[], isLive: true };
  } catch (err) {
    return { data: REAL_LIVE_SIGNALS, isLive: false };
  }
}

export async function fetchPipelineRuns(): Promise<{
  data: PipelineRun[];
  isLive: boolean;
}> {
  if (!supabase) {
    return { data: SAMPLE_RUNS, isLive: false };
  }

  try {
    const { data, error } = await supabase
      .from('pipeline_runs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) {
      return { data: SAMPLE_RUNS, isLive: false };
    }

    return { data: data as PipelineRun[], isLive: true };
  } catch (err) {
    return { data: SAMPLE_RUNS, isLive: false };
  }
}
