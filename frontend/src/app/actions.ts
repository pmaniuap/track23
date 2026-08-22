'use server';

import sourcesData from './sources.json';

export interface SourceDefinition {
  name: string;
  tier: 1 | 2 | 3;
  type: string;
  url?: string;
  query?: string;
  institutions: string[];
  enabled: boolean;
  daily_request_budget?: number;
}

export async function getSourcesConfig(): Promise<SourceDefinition[]> {
  try {
    return sourcesData.sources as SourceDefinition[];
  } catch (e) {
    console.error("Error loading sources configuration", e);
    return [];
  }
}
