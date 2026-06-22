import { RFQPayload } from './types'
import { formatDate, formatDateRequired } from './dateUtils'

export function generateCSVString(payload: RFQPayload): string {
  const { builder, supplier, items, delivery, siteAddress, siteSuburb, dateRequired, rfqId, projectReference, pmName, pmPhone, siteAccessNotes, preferredContact } = payload

  const deliveryLine = delivery === 'delivery'
    ? `Delivery${siteAddress ? ': ' + siteAddress : ''}${siteSuburb ? ', ' + siteSuburb : ''}`
    : 'Store Pick-up'

  const contactLabel = preferredContact === 'phone' ? 'Phone' : preferredContact === 'email' ? 'Email' : 'Phone or Email'

  const meta: (string | number | undefined)[][] = [
    ['RFQ Reference', rfqId],
    ['Date', formatDate()],
    [],
    ['BUILDER DETAILS'],
    ['Name', builder.builderName],
    ['Company', builder.company],
    ['ABN', builder.abn],
    ['Phone', builder.phone],
    ['Email', builder.email],
    [],
    ['SUPPLIER DETAILS'],
    ['Supplier', supplier.supplierName],
    ['Supplier Email', supplier.supplierEmail],
    ['Account Number', supplier.accountNumber],
    [],
    ['PROJECT DETAILS'],
    ['Project Reference', projectReference || ''],
    ...(pmName ? [['PM Name', pmName]] : []),
    ...(pmPhone ? [['PM Phone', pmPhone]] : []),
    [],
    ['DELIVERY'],
    ['Method', deliveryLine],
    ['Date Required', formatDateRequired(dateRequired)],
    ...(delivery === 'delivery' && siteAccessNotes ? [['Site Access Notes', siteAccessNotes]] : []),
    ['Preferred Contact', contactLabel],
    [],
    ['LINE ITEMS'],
    ['#', 'Product Name', 'SKU', 'Description/Specs', 'Unit of Measure', 'Quantity'],
  ]

  const itemRows = items.map((item, i) => [
    String(i + 1),
    item.name,
    item.sku,
    item.desc,
    item.uom,
    item.qty,
  ])

  const allRows = [...meta, ...itemRows]

  // Prefix cells that begin with formula-trigger chars so spreadsheet apps
  // don't execute arbitrary formulas from AI-parsed user content.
  const FORMULA_CHARS = /^[=+\-@\t\r]/
  return allRows
    .map(row =>
      row.map(val => {
        let s = String(val ?? '')
        if (FORMULA_CHARS.test(s)) s = "'" + s
        return `"${s.replace(/"/g, '""')}"`
      }).join(',')
    )
    .join('\n')
}
