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
    // Navigate up from frontend/src/app to the root track23 directory
    const sourcesPath = path.join(process.cwd(), '..', 'sources.yaml');
    
    // In some environments, process.cwd() might be track23 or frontend
    // Let's resolve safely
    const possiblePaths = [
      path.join(process.cwd(), 'sources.yaml'), // If running from track23
      path.join(process.cwd(), '..', 'sources.yaml'), // If running from track23/frontend
      path.join(process.cwd(), '..', '..', 'sources.yaml') // Fallback
    ];

    let fileContents = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        fileContents = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!fileContents) {
      console.warn("Could not find sources.yaml");
      return [];
    }

    const doc = yaml.load(fileContents) as { sources: SourceDefinition[] };
    return doc.sources || [];
  } catch (e) {
    console.error("Error reading sources.yaml", e);
    return [];
  }
}
