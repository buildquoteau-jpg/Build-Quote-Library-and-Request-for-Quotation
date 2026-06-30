export type ParsedListItem = { qty: number; name: string; desc: string; uom: string }

// Robustly pull a JSON array of list items out of an LLM response, recovering
// object-by-object if the whole array fails to parse. Shared by the library
// parse-list (text) and extract-from-image (photo) routes.
export function extractListItems(responseText: string): ParsedListItem[] {
  const start = responseText.indexOf('[')
  const end = responseText.lastIndexOf(']')
  if (start === -1 || end === -1) return []

  let raw: unknown[] = []
  try {
    raw = JSON.parse(responseText.slice(start, end + 1))
  } catch {
    const objMatches = responseText.slice(start, end + 1).match(/\{[^{}]+\}/g) || []
    for (const obj of objMatches) {
      try {
        raw.push(JSON.parse(obj))
      } catch {
        /* skip malformed object */
      }
    }
  }

  return raw
    .map((it): ParsedListItem | null => {
      const item = it as Record<string, unknown>
      const name = String(item?.name ?? '').trim()
      if (!name) return null
      const qtyNum = Number(item?.qty)
      return {
        qty: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1,
        name,
        desc: String(item?.desc ?? '').trim(),
        uom: String(item?.uom ?? 'EA').trim().toUpperCase() || 'EA',
      }
    })
    .filter((x): x is ParsedListItem => x !== null)
}
