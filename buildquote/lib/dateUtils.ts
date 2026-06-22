/** Format a Date object as DD-MM-YYYY */
export function formatDate(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

/** Convert a YYYY-MM-DD string (from <input type="date">) to DD-MM-YYYY */
export function formatDateRequired(value: string | undefined): string {
  if (!value) return 'ASAP'
  const parts = value.split('-')
  if (parts.length !== 3) return value
  const [yyyy, mm, dd] = parts
  return `${dd}-${mm}-${yyyy}`
}
