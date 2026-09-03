// app/routes/api.blog-summary.ts
//
// Resource route (no UI) backing the "Summarize with AI" button in
// AiSummaryBox.tsx. POST only — takes the article's identifying info
// plus its already-resolved contentHtml (by the time a reader is on
// the article page, the loader has already stripped button/quote/
// gallery/etc markers out of it — this posts the same body a reader
// sees, not raw Shopify markup) and returns a SummaryData JSON object
// shaped exactly like what Summary.tsx's extractSummarySection would
// produce from a manual data-summary-embed marker — same type, so the
// same renderSummary() call turns either one into markup.
//
// Cache-by-article-id: the first click for a given article calls the
// model; every click after that (this reader or any other) reads the
// cached result instead. Swap AI_SUMMARY_CACHE for whatever KV/cache
// binding this project actually has — this file only assumes a
// get(key)/put(key, value) interface, matching Oxygen's typical KV
// binding shape.

import type {Route} from './+types/api.blog-summary';
import {
  htmlToPlainText,
  type SummaryData,
  type SummaryLayout,
} from '~/components/blogs/Summary';

const VALID_LAYOUTS: SummaryLayout[] = ['list', 'numbered', 'grid', 'highlight'];

// Guards against a pathologically long article blowing the prompt
// budget — this is a plain-text char cap, not a token cap, so it's
// deliberately generous.
const MAX_INPUT_CHARS = 20_000;

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return Response.json({error: 'Method not allowed'}, {status: 405});
  }

  const body = await request.json().catch(() => null);
  const articleId = typeof body?.articleId === 'string' ? body.articleId : null;
  const contentHtml =
    typeof body?.contentHtml === 'string' ? body.contentHtml : null;

  if (!articleId || !contentHtml) {
    return Response.json(
      {error: 'Missing articleId or contentHtml'},
      {status: 400},
    );
  }

  const cacheKey = `ai-summary:${articleId}`;

  // Cache hit — skip the model call entirely. This is the common case
  // after the first reader on a given article clicks the button.
  const cached = await context.env.AI_SUMMARY_CACHE?.get(cacheKey);
  if (cached) {
    return Response.json({
      summary: JSON.parse(cached) as SummaryData,
      cached: true,
    });
  }

  const plainText = htmlToPlainText(contentHtml).slice(0, MAX_INPUT_CHARS);

  if (!plainText) {
    return Response.json(
      {error: 'Article has no readable content to summarize'},
      {status: 422},
    );
  }

  const apiKey = context.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({error: 'AI summary is not configured'}, {status: 500});
  }

  const prompt = `Summarize the following blog article as a "Key takeaways" box.

Return ONLY a JSON object, no markdown fences, no preamble, matching exactly this shape:
{"title": string, "layout": "list" | "numbered" | "grid" | "highlight", "items": string[]}

- title: a short heading for the box (e.g. "Key Takeaways"). Keep it under 6 words.
- layout: pick whichever fits the content best. Use "numbered" for sequential/ordered points, "grid" for short standalone facts/stats, "highlight" for a single central takeaway, "list" otherwise.
- items: 3-6 short, standalone bullet points capturing the article's main points. Plain text, no markdown, no leading dashes or numbers (the layout adds those).

Article:
"""
${plainText}
"""`;

  let aiResponse: Response;
  try {
    aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{role: 'user', content: prompt}],
      }),
    });
  } catch {
    return Response.json(
      {error: 'Failed to reach the summarization service'},
      {status: 502},
    );
  }

  if (!aiResponse.ok) {
    return Response.json(
      {error: 'Summarization service returned an error'},
      {status: 502},
    );
  }

  const data = await aiResponse.json();
  const rawText = (data?.content ?? [])
    .filter((block: {type: string}) => block.type === 'text')
    .map((block: {text: string}) => block.text)
    .join('')
    .trim();

  let parsed: {title?: unknown; layout?: unknown; items?: unknown};
  try {
    // Model is instructed to return bare JSON, but strip fences
    // defensively in case it wraps the response anyway.
    parsed = JSON.parse(rawText.replace(/^```json\s*|\s*```$/g, ''));
  } catch {
    return Response.json(
      {error: 'Could not parse the generated summary'},
      {status: 502},
    );
  }

  const items = Array.isArray(parsed.items)
    ? parsed.items.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : [];

  if (items.length === 0) {
    return Response.json(
      {error: 'Generated summary had no usable items'},
      {status: 502},
    );
  }

  const layout: SummaryLayout = VALID_LAYOUTS.includes(
    parsed.layout as SummaryLayout,
  )
    ? (parsed.layout as SummaryLayout)
    : 'list';

  const summary: SummaryData = {
    title:
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : 'Key Takeaways',
    layout,
    items,
  };

  // Best-effort cache write — a failure here shouldn't fail the
  // request, it just means the next click pays the model call again.
  await context.env.AI_SUMMARY_CACHE?.put(
    cacheKey,
    JSON.stringify(summary),
  ).catch(() => {});

  return Response.json({summary, cached: false});
}