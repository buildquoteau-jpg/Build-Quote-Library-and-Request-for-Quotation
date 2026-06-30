import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { extractListItems } from '@/lib/extractListItems'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const PROMPT = `You extract structured line items from a builder's materials list. The text may be rough, abbreviated, or use trade shorthand (e.g. "H2 90x35", "Ext Cnr", "Window Adpt", "@" for length).

Return ONLY a raw JSON array — no markdown, no code fences, no explanation. The first character must be [.
Each object must have exactly these keys:
- "qty": number — the count. For "6 @ 4.8m" qty is 6; for "x 10 sheets" qty is 10; for "24 length @ 6.0m" qty is 24. Default to 1 if no count is given.
- "name": string — the product name including brand/profile, e.g. "Linea Weatherboard 150mm", "H2 Pine 90x35", "Construction Adhesive".
- "desc": string — specs/dimensions/length only, e.g. "150mm", "90x35 • 4.8m", "@ 6.0m". Empty string if none.
- "uom": string — best unit: EA, LM, BAG, SHEET, M2, TUBE, BOX, ROLL, LENGTH. Infer if not stated. Use LENGTH for timber/lineal lengths, TUBE for adhesive/sealant sausages.

Rules:
- For "N @ Xm" entries: qty = N, put "@ Xm" / the length into desc, never multiply or concatenate the numbers.
- If a single item lists two length breakdowns (e.g. "24 length @ 6.0m + 12 length @ 3.6m"), split it into TWO separate items with the same name.
- Always keep dimension specs and grade. Put dimensions in desc, not qty.
- Treat spaces/dots/smudges between numbers as separators — do not merge digits (e.g. "1 @ 3.6m" is qty 1, not 13.6).
- Do not invent items. Skip headings like "Materials list" and crossed-out lines.

List:`

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text: string }

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 })
    }

    const completion = (await Promise.race([
      client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1024,
        messages: [{ role: 'user', content: `${PROMPT}\n${text}` }],
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Parse timeout')), 55000)),
    ])) as OpenAI.Chat.ChatCompletion

    const responseText = completion.choices[0]?.message?.content ?? ''
    const items = extractListItems(responseText)

    return NextResponse.json({ items })
  } catch (err) {
    if (err instanceof OpenAI.APIError && err.status === 401) {
      console.error('[library/parse-list] OpenAI key invalid/missing')
      return NextResponse.json({ error: 'OpenAI API key is invalid or missing.' }, { status: 401 })
    }
    console.error('[library/parse-list]', err)
    return NextResponse.json({ error: 'Parse error' }, { status: 500 })
  }
}
