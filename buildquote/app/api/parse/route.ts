import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import ExcelJS from 'exceljs'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const PROMPT = `You extract structured line items from construction materials lists, takeoffs, builder notes, handwritten site lists, PDFs, spreadsheets, and photos.

Priority:
- Extract real purchasable construction items accurately
- Keep product name separate from specs
- Preserve useful dimensions, material, finish, and colour in desc
- Ignore headings, instructions, and admin notes unless they clearly describe an item

Important rules:
- Construction-focused parsing only
- Prefer building-material interpretation over generic consumer-goods interpretation
- Do NOT invent items
- Do NOT merge unrelated lines into one item
- Do NOT drop real items just because they are handwritten, abbreviated, rough, or missing punctuation
- Extract EVERY plausible purchasable construction line item you can see, even when messy
- Do NOT include section headings as items
- Do NOT include people names, contact notes, dates, or reminder notes as items
- Do NOT include instruction-only lines such as "check with Gary first", "Tony to confirm", "do not order yet", unless the same line also contains a real item
- Skip crossed out or cancelled items
- If an item is uncertain, still include it, but set confidence to "low"

How to split fields:
- "name" = short product name only, not the whole raw line
- "desc" = specs/details only, such as size, thickness, profile, colour, finish, grade, material, diameter, gauge, treatment, pack details
- "uom" = best unit of measure, such as EA, LM, m2, BAG, SHEET, BOX, ROLL, LENGTH
- "qty" = quantity only, as a string

Field rules:
- Do NOT put SKU into desc
- Do NOT put quantity into name
- Do NOT put quantity into desc unless it is part of a pack size that matters
- Keep name concise and trade-usable
- Keep desc concise but specific
- Correct obvious spelling mistakes only when clear

For construction materials, prefer this structure:
- Timber example:
  raw: "90x45 MGP10 pine 6m x 48"
  name: "MGP10 Pine"
  desc: "90x45 • 6m"
  uom: "LENGTH"
  qty: "48"

- Cladding example:
  raw: "hardie linea 180mm x 210"
  name: "Hardie Linea"
  desc: "180mm"
  uom: "EA"
  qty: "210"

- Plasterboard example:
  raw: "gyprock 10mm standard sheets x 85"
  name: "Gyprock Standard"
  desc: "10mm"
  uom: "SHEET"
  qty: "85"

- Fixings example:
  raw: "framing nails 90x3.15 galv x 10 boxes"
  name: "Framing Nails"
  desc: "90x3.15 • galvanised"
  uom: "BOX"
  qty: "10"

- Pipe example:
  raw: "copper pipe 15mm x 6m lengths x 20"
  name: "Copper Pipe"
  desc: "15mm • 6m"
  uom: "LENGTH"
  qty: "20"

- Handwritten timber example:
  raw: "H2 190 x 35 - 2 @ 3.6m"
  name: "H2 Pine"
  desc: "190x35 • 3.6m"
  uom: "LENGTH"
  qty: "2"

- Post example:
  raw: "H4 100 x 100 F7 pine post x 6 @ 2.7m or 3.0m"
  name: "F7 Pine Post"
  desc: "H4 • 100mm x 100mm • 2.7m or 3.0m"
  uom: "LENGTH"
  qty: "6"

- Quantity parsing example:
  raw: "gutters 150mm quad SG x 561lm"
  name: "Gutters"
  desc: "150mm • quad SG"
  uom: "LM"
  qty: "561"

Trade and heading rules:
- Treat headings like BUILDING MATERIALS, PLUMBING, ELECTRICAL, FIXINGS as non-item section headings
- Treat comments like "(check with Gary first)" or "(Tony to confirm)" as notes, not products
- If a real item appears on the same line as a note, extract only the item and ignore the note

Spec rules for desc:
Include only useful specs such as:
- length
- width
- depth
- thickness
- diameter
- gauge
- profile
- grade
- treatment
- material
- finish
- texture
- colour
- pack type where relevant


- Quantity notation rule (CRITICAL):
  If a line contains patterns like:
    "2 @ 3.6m"
    "6 @ 2.7m"
    "1 @ 3.6m"
  Then:
    - qty = number BEFORE @
    - length/dimension AFTER @ goes into desc
    - NEVER combine or concatenate numbers (e.g. do NOT turn "1 @ 3.6m" into 12)

- Handwritten spacing rule:
  Treat spaces, dots, or smudges between numbers as separators — do NOT merge digits


Confidence rules — set confidence to "low" if ANY of these apply:
- handwriting or scan is hard to read
- quantity is estimated or unclear
- product name is incomplete
- units/specs are ambiguous
- line may be a note rather than an item

Return ONLY a raw JSON array. No markdown, no code fences, no explanation. First character must be [
Each object must have exactly these keys:
  "name"       - short product name only
  "sku"        - supplier SKU if visible, else ""
  "productId"  - manufacturer ID if visible, else ""
  "desc"       - specs/details only, not full raw line
  "uom"        - unit of measure: EA, LM, m2, BAG, SHEET, ROLL, BOX, LENGTH, etc
  "qty"        - quantity as a string
  "confidence" - "high" if clear, "low" if uncertain
Respond with ONLY the JSON array starting with [`

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_TEXT_SIZE = 100 * 1024
const MAX_PDF_PAGES = 10

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 60 * 1000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.csv', '.txt', '.xls', '.xlsx', '.doc', '.docx']
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/csv', 'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

// ---------------------------------------------------------------------------
// PDF helper — send PDF directly to OpenAI Responses API.
// This avoids Node canvas/pdfjs runtime issues on serverless builds.
// ---------------------------------------------------------------------------
async function parsePDFWithOpenAI(buffer: Buffer, filename: string): Promise<string> {
  const base64 = buffer.toString('base64')
  const response = await Promise.race([
    client.responses.create({
      model: 'gpt-4o',
      max_output_tokens: 8192,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_file',
              filename,
              file_data: `data:application/pdf;base64,${base64}`,
            },
            { type: 'input_text', text: PROMPT },
          ],
        },
      ],
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Parse timeout')), 55000)
    ),
  ]) as OpenAI.Responses.Response

  return response.output_text ?? ''
}


function normaliseUOM(value: string): string {
  const v = (value || '').trim().toUpperCase()
  if (!v) return ''
  if (['EACH', 'PCS', 'PC', 'UNIT'].includes(v)) return 'EA'
  if (['LM', 'L/M', 'LIN M', 'LINEAL METRE', 'LINEAR METRE', 'LINEAR METRES', 'LINEAL METRES'].includes(v)) return 'LM'
  if (['M2', 'SQM', 'M²', 'SQ M'].includes(v)) return 'm2'
  if (['SHEETS'].includes(v)) return 'SHEET'
  if (['BOXES'].includes(v)) return 'BOX'
  if (['ROLLS'].includes(v)) return 'ROLL'
  if (['LENGTHS'].includes(v)) return 'LENGTH'
  if (['BAGS'].includes(v)) return 'BAG'
  return v
}

function extractQty(value: unknown, uom: string, desc: string): string {
  const raw = String(value ?? '').trim()
  const clean = raw.replace(/,/g, '').trim()
  const descText = String(desc || '').trim()

  if (clean) {
    const direct = clean.match(/^\d+(?:\.\d+)?$/)
    if (direct) return direct[0]

    const attached = clean.match(/(\d+(?:\.\d+)?)(?=\s*(?:lm|l\.m\.?|lineal|lengths?|boxes?|bags?|rolls?|sheets?|ea)\b)/i)
    if (attached) return attached[1]

    const first = clean.match(/\d+(?:\.\d+)?/)
    if (first) return first[0]
  }

  const timberAtPattern = descText.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*@\s*\d+(?:\.\d+)?m\b/i)
  if (timberAtPattern) return timberAtPattern[1]

  const fromDesc = descText.match(/(?:^|\b|x\s*)(\d+(?:\.\d+)?)(?=\s*(?:lm|l\.m\.?|lineal|lengths?|boxes?|bags?|rolls?|sheets?|ea)\b)/i)
  if (fromDesc) return fromDesc[1]

  return ''
}


function hasAmbiguousHandwrittenQty(name: string, desc: string, qty: string, uom: string): boolean {
  const q = String(qty || '').trim()
  const n = String(name || '').toLowerCase()
  const d = String(desc || '').toLowerCase()
  const unit = String(uom || '').toUpperCase()

  if (!q || !/^\d{2}$/.test(q)) return false
  if (unit && !['LENGTH', 'LM', 'EA', ''].includes(unit)) return false

  const hasLength = /\b\d+(?:\.\d+)?\s*m\b/i.test(d)
  const hasDimensions = /\b\d{2,4}\s*[x×]\s*\d{2,4}\b/i.test(d)
  const timberLike = /\b(?:h\d|f\d|mgp|lvl|pine|post|stud|joist|beam|timber)\b/i.test(`${n} ${d}`)
  const ambiguousPair = /\b(?:12|22|32|42|52|62|72|82|92)\b/.test(q)

  return ambiguousPair && hasLength && (hasDimensions || timberLike)
}

function cleanupDesc(desc: string, qty: string): string {
  let next = (desc || '').replace(/[•|]+/g, ' • ').replace(/\s+/g, ' ').trim()
  next = next.replace(/(?:^|\s)x\s*\d+(?:\.\d+)?\s*(?:lm|l\.m\.?|lineal|lengths?|boxes?|bags?|rolls?|sheets?|ea)?$/i, '').trim()
  if (qty) {
    next = next.replace(new RegExp(`(?:^|\\s)x?\\s*${qty}(?:\\.0+)?\\s*(?:lm|l\\.m\\.?|lineal|lengths?|boxes?|bags?|rolls?|sheets?|ea)?$`, 'i'), '').trim()
  }
  next = next.replace(/^[-–—,:;•\s]+|[-–—,:;•\s]+$/g, '').trim()
  next = next.replace(/\s*•\s*/g, ' • ')
  return next
}

function inferUOM(name: string, desc: string, current: string): string {
  const u = normaliseUOM(current)
  if (u) return u
  const hay = `${name} ${desc}`.toLowerCase()
  if (/(sheet|plywood|plasterboard|gyprock|mdf)/.test(hay)) return 'SHEET'
  if (/(box|screw|nail|bolt|washer|bracket|anchor)/.test(hay)) return 'BOX'
  if (/(roll|cable|wire)/.test(hay)) return 'ROLL'
  if (/(pipe|gutter|flashing|trimdek|trim|moulding)/.test(hay)) return 'LM'
  if (/(pine|lvl|post|beam|joist|stud|timber|length)/.test(hay)) return 'LENGTH'
  if (/(batts?|bag)/.test(hay)) return 'BAG'
  return 'EA'
}

function normaliseParsedItem(item: any) {
  let name = String(item?.name || '').replace(/\s+/g, ' ').trim()
  let sku = String(item?.sku || '').trim()
  let productId = String(item?.productId || '').trim()
  let desc = String(item?.desc || '').replace(/\s+/g, ' ').trim()
  let qty = extractQty(item?.qty, String(item?.uom || ''), desc)
  let uom = inferUOM(name, desc, String(item?.uom || ''))

  if (/^simpson$/i.test(name) && sku) {
    desc = cleanupDesc([desc, sku].filter(Boolean).join(' • '), qty)
    sku = ''
  }

  if (/^specs?$/i.test(desc)) desc = ''

  desc = cleanupDesc(desc, qty)

  const confidence =
    item?.confidence === 'low' || hasAmbiguousHandwrittenQty(name, desc, qty, uom)
      ? 'low'
      : 'high'

  return {
    id: randomUUID(),
    name,
    sku,
    productId,
    desc,
    uom,
    qty,
    confidence,
  }
}

function getParseErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429 || error.code === 'insufficient_quota') {
      return NextResponse.json(
        {
          items: [],
          error: 'OpenAI quota exceeded. Please check billing, then retry.',
          code: 'insufficient_quota',
        },
        { status: 429 }
      )
    }

    if (error.status === 401) {
      return NextResponse.json(
        {
          items: [],
          error: 'OpenAI API key is invalid or missing.',
          code: 'invalid_api_key',
        },
        { status: 401 }
      )
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { items: [], error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ items: [] })

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { items: [], error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { items: [], error: 'File type not supported.' },
        { status: 400 }
      )
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { items: [], error: 'File extension not supported.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const isImage = file.type.startsWith('image/')
    const isPDF = file.type === 'application/pdf'

    let messages: OpenAI.Chat.ChatCompletionMessageParam[]

    if (isImage) {
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${file.type};base64,${base64}`, detail: 'high' },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ]
    } else if (isPDF) {
      const responseText = await parsePDFWithOpenAI(buffer, file.name)
      const start = responseText.indexOf('[')
      const end = responseText.lastIndexOf(']')
      let items: any[] = []

      if (start !== -1 && end !== -1) {
        try {
          items = JSON.parse(responseText.slice(start, end + 1))
        } catch {
          console.warn('Full JSON parse failed, attempting object-by-object recovery')
          const chunk = responseText.slice(start, end + 1)
          const objMatches = chunk.match(/\{[^{}]+\}/g) || []
          for (const obj of objMatches) {
            try {
              const parsed = JSON.parse(obj)
              if (parsed.name) items.push(parsed)
            } catch {
              // skip malformed object
            }
          }
        }
      }

      const result = items
        .filter((item: any) => item && typeof item.name === 'string' && item.name.trim() !== '')
        .map(normaliseParsedItem)
        .filter((item: any) => item.name)

      return NextResponse.json({ items: result })
    } else if (['.xlsx', '.xls'].includes(ext)) {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer as any)
      const csvSheets: string[] = []
      workbook.eachSheet((sheet) => {
        const rows: string[] = []
        sheet.eachRow((row) => {
          const values = (row.values as ExcelJS.CellValue[]).slice(1)
          rows.push(values.map(v => (v === null || v === undefined ? '' : String(v))).join(','))
        })
        csvSheets.push(`Sheet: ${sheet.name}\n${rows.join('\n')}`)
      })
      const csvText = csvSheets.join('\n\n')
      if (csvText.length > MAX_TEXT_SIZE) {
        return NextResponse.json(
          { items: [], error: 'Spreadsheet too large. Please reduce the number of rows.' },
          { status: 400 }
        )
      }
      messages = [{ role: 'user', content: `${PROMPT}\n\nSpreadsheet data (CSV format):\n${csvText}` }]
    } else {
      if (file.size > MAX_TEXT_SIZE) {
        return NextResponse.json(
          { items: [], error: 'Text file too large. Maximum size is 100KB.' },
          { status: 400 }
        )
      }
      const text = buffer.toString('utf-8')
      messages = [{ role: 'user', content: `${PROMPT}\n\nDocument:\n${text}` }]
    }

    const completion = await Promise.race([
      client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 8192,
        messages,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Parse timeout')), 55000)
      ),
    ]) as OpenAI.Chat.ChatCompletion

    const responseText = completion.choices[0]?.message?.content ?? ''

    const start = responseText.indexOf('[')
    const end = responseText.lastIndexOf(']')
    let items: any[] = []

    if (start !== -1 && end !== -1) {
      try {
        items = JSON.parse(responseText.slice(start, end + 1))
      } catch {
        console.warn('Full JSON parse failed, attempting object-by-object recovery')
        const chunk = responseText.slice(start, end + 1)
        const objMatches = chunk.match(/\{[^{}]+\}/g) || []
        for (const obj of objMatches) {
          try {
            const parsed = JSON.parse(obj)
            if (parsed.name) items.push(parsed)
          } catch {
            // skip malformed object
          }
        }
      }
    }

    const result = items
      .filter((item: any) => item && typeof item.name === 'string' && item.name.trim() !== '')
      .map(normaliseParsedItem)
      .filter((item: any) => item.name)

    return NextResponse.json({ items: result })

  } catch (e) {
    const mappedError = getParseErrorResponse(e)
    if (mappedError) {
      console.error('Parse error:', e)
      return mappedError
    }

    console.error('Parse error:', e)
    return NextResponse.json({ items: [], error: 'Failed to parse file' }, { status: 500 })
  }
}
