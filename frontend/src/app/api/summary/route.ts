// src/app/api/summary/route.ts
// Server-side Next.js Route Handler for generating Groq AI summaries.
// Keeps GROQ_API_KEY 100% server-side on Vercel, preventing key exposure in browser DevTools.

import { NextResponse } from 'next/server';
import { MarketSignal, FilterState } from '../../../types';

interface GroupedSignals {
  [institution: string]: MarketSignal[];
}

function groupByInstitution(signals: MarketSignal[]): GroupedSignals {
  const grouped: GroupedSignals = {};
  for (const signal of signals) {
    if (!grouped[signal.institution]) {
      grouped[signal.institution] = [];
    }
    grouped[signal.institution].push(signal);
  }
  return grouped;
}

function describeFilters(filters: FilterState): string {
  const parts: string[] = [];
  if (filters.selectedInstitution) parts.push(`Institution: ${filters.selectedInstitution}`);
  if (filters.selectedEventType) parts.push(`Event Type: ${filters.selectedEventType}`);
  if (filters.selectedCategory) parts.push(`Category: ${filters.selectedCategory}`);
  if (filters.selectedRegion && filters.selectedRegion !== 'All') parts.push(`Region: ${filters.selectedRegion}`);
  if (filters.searchQuery?.trim()) parts.push(`Keyword: "${filters.searchQuery.trim()}"`);
  if (filters.showStarredOnly) parts.push('Starred Only: Yes');
  return parts.length > 0 ? parts.join(' | ') : 'None';
}

function buildFallbackSummary(signals: MarketSignal[], filters: FilterState): string {
  if (signals.length === 0) return 'No signals matched the selected filters.';

  const grouped = groupByInstitution(signals);
  const topInst = Object.entries(grouped)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 3)
    .map(([inst]) => inst)
    .join(', ');

  const eventCounts: Record<string, number> = {};
  for (const s of signals) {
    eventCounts[s.event_type] = (eventCounts[s.event_type] || 0) + 1;
  }
  const topEvent = Object.entries(eventCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'Market Activity';

  const line1 = `Accelerating market activity led by ${topInst} with primary focus on ${topEvent}.`;
  const bullets = signals
    .slice(0, 5)
    .map((s) => `- ${s.institution}: ${s.raw_title.slice(0, 45)}`)
    .join('\n');

  return `${line1}\n${bullets}`;
}

export async function POST(req: Request) {
  try {
    const { signals, filters } = (await req.json()) as {
      signals: MarketSignal[];
      filters: FilterState;
    };

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || !signals || signals.length === 0) {
      return NextResponse.json({ summary: buildFallbackSummary(signals || [], filters || {}) });
    }

    const sample = signals.slice(0, 60);
    const signalLines = sample
      .map(
        (s) =>
          `- [${s.institution}] [${s.event_type}] ${s.raw_title} | ${s.so_what.slice(0, 200)}`
      )
      .join('\n');

    const prompt = `You are a senior financial market intelligence analyst.
Below is a list of ${signals.length} market signals filtered by: ${describeFilters(filters)}.

Signals:
${signalLines}

Write an executive briefing summary using EXACTLY the following 2-part structure:

Line 1: A single clear sentence summarizing the overall overarching trend across these signals.

Lines 2 to 6: Exactly 5 telegram-style bullet lines (or up to 5 if fewer than 5 signals exist) highlighting the top 5 most innovative or newest developments. Don't worry about complete grammar. Each bullet MUST follow this exact format:
- <Institution Name>: <Action in 3-5 words>

Example Output Format:
Accelerating shift toward instant account-to-account settlement and AI-driven banking across global payment rails.
- Visa: Launches account-to-account UK network
- Revolut: Launches instant global P2P
- State Bank of India: Integrates AI assistant YONO
- Monzo: Deploys smart fraud prevention tools
- DBS: Expands institutional crypto custody

CRITICAL RULES:
- Line 1 MUST be a single trend sentence.
- Lines 2+ MUST be bullet points starting with "- <Institution Name>: <Action in 3-5 words>".
- Do NOT output extra intro text, headings, or conclusion lines.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      console.warn('[api/summary] Groq API error response — using fallback summary.');
      return NextResponse.json({ summary: buildFallbackSummary(signals, filters) });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ summary: text || buildFallbackSummary(signals, filters) });
  } catch (err) {
    console.error('[api/summary] Route handler error:', err);
    return NextResponse.json({ summary: 'Market intelligence signals summary unavailable.' });
  }
}
