import OpenAI from 'openai'
import { NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 fallback for /library search.
//
// Only called from the client when the instant deterministic search
// (lib/searchSynonyms.ts) returns no confident match AND the user explicitly
// submits (Enter / "Ask BuildQuote AI" button) — never on keystroke. It turns a
// natural-language job question into 2–5 plain product search terms that are then
// run back through the SAME local ranked search. It does NOT answer questions,
// give advice, or invent products — it only maps language to search keywords,
// grounded in the library's actual categories.
// ─────────────────────────────────────────────────────────────────────────────

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function buildPrompt(query: string, categories: string[]): string {
  const cats = categories.filter(Boolean).slice(0, 80).join(', ')
  return `You convert a builder's natural-language request into building-PRODUCT search keywords for the BuildQuote product library. You do NOT give building, compliance, engineering or installation advice. You ONLY return search keywords.

The library is organised into these product categories:
${cats || '(no categories supplied)'}

Return ONLY a JSON object — no markdown, no prose — of this exact shape:
{"terms": ["keyword1", "keyword2"], "interpretation": "short plain-English restatement of what they're looking for"}

Rules:
- "terms": 2 to 5 short building-PRODUCT keywords (1–2 words each) a supplier would recognise — e.g. "waterproofing", "membrane", "fibre cement", "decking", "cladding", "fixings". Prefer words that align with the categories above.
- Map intent to products: "ripping up bathroom tiles" → waterproofing, membrane, primer, wet area lining, sealant. "keep the rain out" → waterproofing, membrane, flashing.
- "interpretation": one short sentence, product-finding only. Never assert suitability, compliance or how to install.
- Do NOT invent product brand or model names. Keep terms generic.
- If the request is not about building products at all, return {"terms": [], "interpretation": ""}.

Request: ${query}`
}

export async function POST(req: Request) {
  try {
    const { query, categories } = (await req.json()) as { query?: string; categories?: string[] }

    if (!query?.trim()) {
      return NextResponse.json({ terms: [], interpretation: '' })
    }
    // Fail safe — if the key is absent, let the client keep its local results.
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ terms: [], interpretation: '' })
    }

    const completion = (await Promise.race([
      client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 200,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: buildPrompt(query, Array.isArray(categories) ? categories : []) }],
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Interpret timeout')), 12000)),
    ])) as OpenAI.Chat.ChatCompletion

    const raw = completion.choices[0]?.message?.content ?? '{}'
    let parsed: { terms?: unknown; interpretation?: unknown } = {}
    try { parsed = JSON.parse(raw) } catch { /* fall through to empty */ }

    const terms = Array.isArray(parsed.terms)
      ? parsed.terms.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 5)
      : []
    const interpretation = typeof parsed.interpretation === 'string' ? parsed.interpretation : ''

    return NextResponse.json({ terms, interpretation })
  } catch (err) {
    if (err instanceof OpenAI.APIError && err.status === 401) {
      console.error('[library/interpret-query] OpenAI key invalid/missing')
    } else {
      console.error('[library/interpret-query]', err)
    }
    // Always degrade gracefully — the client keeps showing its local results.
    return NextResponse.json({ terms: [], interpretation: '' })
  }
}
