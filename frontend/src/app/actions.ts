'use server';

import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';

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
    // Use a statically analyzable path so Vercel includes it in the Lambda
    const sourcesPath = path.join(process.cwd(), 'sources.yaml');
    
    if (!fs.existsSync(sourcesPath)) {
      console.warn("Could not find sources.yaml at", sourcesPath);
      return [];
    }

    const fileContents = fs.readFileSync(sourcesPath, 'utf8');

    const doc = yaml.load(fileContents) as { sources: SourceDefinition[] };
    return doc.sources || [];
  } catch (e) {
    console.error("Error reading sources.yaml", e);
    return [];
  }
}
