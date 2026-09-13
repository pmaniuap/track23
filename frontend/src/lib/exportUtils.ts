// src/lib/exportUtils.ts
// Single export seam: CSV download, PDF print preview, LLM trend summary.
// No export logic should live in components — call these functions instead.

import { MarketSignal, FilterState } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupedSignals {
  [institution: string]: MarketSignal[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Date as "13Sep26" (DDMMMYY). */
function formatExportDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' }); // "Sep"
  const year = String(date.getFullYear()).slice(-2); // "26"
  return `${day}${month}${year}`;
}

/** Group signals by institution (A–Z), sorted newest-first within each group. */
function groupByInstitution(signals: MarketSignal[]): GroupedSignals {
  const grouped: GroupedSignals = {};

  for (const signal of signals) {
    if (!grouped[signal.institution]) {
      grouped[signal.institution] = [];
    }
    grouped[signal.institution].push(signal);
  }

  // Sort within each group: newest published_at first
  for (const inst of Object.keys(grouped)) {
    grouped[inst].sort(
      (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  }

  return grouped;
}

/** Summarise active filters as a readable string (e.g. "Institution: Revolut | Event: Product Launch"). */
function describeFilters(filters: FilterState): string {
  const parts: string[] = [];
  if (filters.selectedInstitution) parts.push(`Institution: ${filters.selectedInstitution}`);
  if (filters.selectedEventType) parts.push(`Event Type: ${filters.selectedEventType}`);
  if (filters.selectedCategory) parts.push(`Category: ${filters.selectedCategory}`);
  if (filters.selectedRegion && filters.selectedRegion !== 'All') parts.push(`Region: ${filters.selectedRegion}`);
  if (filters.searchQuery.trim()) parts.push(`Keyword: "${filters.searchQuery.trim()}"`);
  if (filters.showStarredOnly) parts.push('Starred Only: Yes');
  return parts.length > 0 ? parts.join(' | ') : 'None';
}

/** Count signals per institution and return as a readable string. */
function institutionCountSummary(grouped: GroupedSignals): string {
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([inst, sigs]) => `${inst} (${sigs.length})`)
    .join(', ');
}

// ---------------------------------------------------------------------------
// LLM Trend Summary
// ---------------------------------------------------------------------------

/**
 * Call Groq (gpt-oss-120b) to generate a 2–4 sentence trend briefing paragraph
 * from the filtered signals. Sends institution, event_type, raw_title, and so_what
 * per signal. Falls back to a static sentence if the API call fails or key is absent.
 */
export async function generateTrendSummary(
  signals: MarketSignal[],
  filters: FilterState
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

  if (!apiKey || signals.length === 0) {
    return buildFallbackSummary(signals, filters);
  }

  // Build a compact signal list for the prompt — cap at 60 signals to stay within token limits
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

Write a briefing paragraph of 2–4 complete sentences, between 60 and 100 words, that:
1. Identifies the dominant theme or trend across these signals.
2. Names the most active institutions or sectors.
3. Highlights the most significant or surprising event if one stands out.

CRITICAL RULES:
- Every sentence MUST be grammatically complete. Do NOT end mid-sentence or mid-word.
- The paragraph MUST be at least 60 words and no more than 100 words.
- Output only the paragraph. No headings, no bullet points, no preamble.`;

  try {
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
      console.warn('[exportUtils] Groq API error — using fallback summary.');
      return buildFallbackSummary(signals, filters);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || buildFallbackSummary(signals, filters);
  } catch (err) {
    console.warn('[exportUtils] Groq API call failed — using fallback summary.', err);
    return buildFallbackSummary(signals, filters);
  }
}

/** Deterministic fallback summary when the LLM call is unavailable. */
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
  const topEvent = Object.entries(eventCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '';

  return `This export covers ${signals.length} market signal${signals.length !== 1 ? 's' : ''} with active filters: ${describeFilters(filters)}. The most active institutions are ${topInst}. The dominant event type is "${topEvent}".`;
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

/**
 * Build the CSV string and trigger a browser download.
 * Summary block is written as `# comment` lines above the column headers.
 */
const EXPORT_SIGNAL_LIMIT = 100;

export async function downloadCSV(
  signals: MarketSignal[],
  filters: FilterState
): Promise<void> {
  if (signals.length > EXPORT_SIGNAL_LIMIT) {
    throw new Error(`TOO_MANY_SIGNALS:${signals.length}`);
  }
  const now = new Date();
  const dateStr = formatExportDate(now);
  const grouped = groupByInstitution(signals);

  // Generate LLM summary (awaited — button should show a loading state while this runs)
  const trendSummary = await generateTrendSummary(signals, filters);

  const lines: string[] = [];

  // --- Summary block (commented lines) ---
  lines.push(`# Track23 — Signal Export`);
  lines.push(`# Exported: ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
  lines.push(`# Filters applied: ${describeFilters(filters)}`);
  lines.push(`# Signals by institution: ${institutionCountSummary(grouped)}`);
  lines.push(`#`);
  lines.push(`# Trend Summary:`);
  // Wrap the trend summary as a comment block (each line prefixed with #)
  for (const line of trendSummary.split('\n')) {
    lines.push(`# ${line}`);
  }
  lines.push(`#`);

  // --- Column headers ---
  lines.push(
    ['Institution', 'Event Type', 'Signal Title', 'So What', 'Source URL', 'Published Date', 'Technologies']
      .map(csvCell)
      .join(',')
  );

  // --- Rows grouped by institution (A–Z), newest-first within ---
  for (const institution of Object.keys(grouped).sort()) {
    for (const signal of grouped[institution]) {
      lines.push(
        [
          signal.institution,
          signal.event_type,
          signal.raw_title,
          signal.so_what,
          signal.source_url,
          new Date(signal.published_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          signal.technologies.join('; '),
        ]
          .map(csvCell)
          .join(',')
      );
    }
  }

  const csv = lines.join('\r\n');
  triggerDownload(`Signals_Export_${dateStr}.csv`, csv, 'text/csv;charset=utf-8;');
}

/** Escape a value for safe inclusion in a CSV cell. */
function csvCell(value: string | undefined): string {
  const str = String(value ?? '');
  // Wrap in quotes if the value contains a comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Trigger a file download in the browser. */
function triggerDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// PDF Print Preview
// ---------------------------------------------------------------------------

/**
 * Open a new browser tab with a clean, print-optimised HTML page of the signals.
 * The user hits Cmd+P / Ctrl+P to save as PDF. Zero external dependencies.
 */
export async function openPDFPreview(
  signals: MarketSignal[],
  filters: FilterState
): Promise<void> {
  if (signals.length > EXPORT_SIGNAL_LIMIT) {
    throw new Error(`TOO_MANY_SIGNALS:${signals.length}`);
  }

  // 1. Open new tab synchronously to ensure browser pop-up blocker does not block it
  const newTab = window.open('', '_blank');
  if (!newTab) {
    alert('Pop-up blocked. Please allow pop-ups for this site to use PDF preview.');
    return;
  }

  const now = new Date();
  const dateStr = formatExportDate(now);
  const grouped = groupByInstitution(signals);

  // Write base HTML with loading state for summary
  const initialHtml = buildPrintHTML({
    signals,
    grouped,
    filters,
    trendSummary: 'Generating executive briefing with Groq Llama 3 120B...',
    now,
    dateStr,
  });

  newTab.document.open();
  newTab.document.write(initialHtml);
  newTab.document.close();

  // 2. Generate dynamic LLM summary asynchronously & stream into opened document
  try {
    const trendSummary = await generateTrendSummary(signals, filters);
    const summaryEl = newTab.document.getElementById('trend-summary-text');
    if (summaryEl) {
      summaryEl.textContent = trendSummary;
    }
  } catch (err) {
    console.error('Failed to generate trend summary:', err);
  }
}

interface PrintHTMLArgs {
  signals: MarketSignal[];
  grouped: GroupedSignals;
  filters: FilterState;
  trendSummary: string;
  now: Date;
  dateStr: string;
}

function buildPrintHTML({ signals, grouped, filters, trendSummary, now, dateStr }: PrintHTMLArgs): string {
  const institutionSections = Object.keys(grouped)
    .sort()
    .map((institution) => {
      const rows = grouped[institution]
        .map(
          (s) => `
          <tr>
            <td class="event-type">${escHtml(s.event_type)}</td>
            <td class="title">${escHtml(s.raw_title)}</td>
            <td class="so-what">${escHtml(s.so_what)}</td>
            <td class="date">${new Date(s.published_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            <td class="tech">${escHtml(s.technologies.join(', '))}</td>
            <td class="url"><a href="${escHtml(s.source_url)}">${escHtml(s.source_name)}</a></td>
          </tr>`
        )
        .join('');

      return `
        <section class="institution-section">
          <h2>${escHtml(institution)} <span class="count">(${grouped[institution].length})</span></h2>
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Title</th>
                <th>So What</th>
                <th>Date</th>
                <th>Technologies</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Signals_Export_${dateStr}</title>
  <style>
    /* ---- Base ---- */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Georgia', serif;
      font-size: 10pt;
      color: #000;
      background: #fff;
      padding: 0.5cm 2cm 2cm;
    }
    a { color: #000; }

    /* ---- Header block ---- */
    .report-header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
    .report-header h1 { font-size: 16pt; font-weight: bold; letter-spacing: 0.02em; }
    .report-header .meta { font-size: 8pt; color: #444; margin-top: 4px; }

    /* ---- Summary block ---- */
    .summary-block {
      border: 1px solid #000;
      padding: 12px 16px;
      margin-bottom: 24px;
    }
    .summary-block .label { font-weight: bold; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
    .summary-block .filters { font-size: 8pt; color: #444; margin-bottom: 8px; }
    .summary-block .trend { font-size: 10pt; line-height: 1.55; }
    .summary-block .inst-counts { font-size: 8pt; color: #444; margin-top: 8px; border-top: 1px solid #ccc; padding-top: 6px; }

    /* ---- Institution sections ---- */
    .institution-section { margin-bottom: 28px; page-break-inside: avoid; }
    .institution-section h2 {
      font-size: 11pt;
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .institution-section h2 .count { font-weight: normal; font-size: 9pt; }

    /* ---- Table ---- */
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    th {
      text-align: left;
      font-weight: bold;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid #000;
      padding: 4px 6px 4px 0;
    }
    td { padding: 5px 6px 5px 0; vertical-align: top; border-bottom: 1px solid #ddd; }
    tr:last-child td { border-bottom: none; }
    .event-type { width: 10%; white-space: nowrap; font-weight: 600; }
    .title { width: 18%; }
    .so-what { width: 32%; line-height: 1.45; }
    .date { width: 8%; white-space: nowrap; }
    .tech { width: 14%; color: #333; }
    .url { width: 10%; word-break: break-all; font-size: 7.5pt; }

    /* ---- Print ---- */
    @media print {
      body { padding: 0; }
      @page { margin: 1.5cm; size: A4 landscape; }
      .institution-section { page-break-inside: avoid; }
      a { text-decoration: none; color: #000; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background:#f5f5f5;padding:6px 16px;font-family:sans-serif;font-size:11px;border-bottom:1px solid #ddd;color:#555;">
    <strong style="color:#222;">PDF Preview</strong> &nbsp;·&nbsp; Press <kbd style="background:#e0e0e0;padding:1px 5px;border-radius:3px;">Cmd+P</kbd> or <kbd style="background:#e0e0e0;padding:1px 5px;border-radius:3px;">Ctrl+P</kbd>, choose <strong style="color:#222;">Save as PDF</strong>, set orientation to <strong style="color:#222;">Landscape</strong>.
  </div>

  <div class="report-header">
    <h1>Track23 — Market Intelligence Export</h1>
    <div class="meta">
      Exported: ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST &nbsp;|&nbsp;
      Total signals: ${signals.length} &nbsp;|&nbsp;
      Filters: ${escHtml(describeFilters(filters))}
    </div>
  </div>

  <div class="summary-block">
    <div class="label">Trend Summary</div>
    <div class="filters">Filters applied: ${escHtml(describeFilters(filters))}</div>
    <div class="trend" id="trend-summary-text">${escHtml(trendSummary)}</div>
    <div class="inst-counts">By institution: ${escHtml(institutionCountSummary(grouped))}</div>
  </div>

  ${institutionSections}
</body>
</html>`;
}

/** Escape a string for safe HTML insertion. */
function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
