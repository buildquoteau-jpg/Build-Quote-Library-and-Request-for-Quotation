import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { RFQPayload } from './types'

export async function generatePDFBuffer(payload: RFQPayload): Promise<Buffer> {
  const { builder, supplier, items, delivery, siteAddress, siteSuburb, dateRequired, message, rfqId, pmName, pmPhone, siteAccessNotes, preferredContact } = payload

  const doc = await PDFDocument.create()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

  const orange = rgb(0.976, 0.451, 0.086)
  const dark = rgb(0.094, 0.365, 0.478)
  const grey = rgb(0.42, 0.44, 0.47)
  const white = rgb(1, 1, 1)
  const lightgrey = rgb(0.97, 0.98, 0.98)

  const W = 595
  const H = 842
  const FOOTER_H = 56
  const MIN_Y = FOOTER_H + 16

  // Track all pages so we can draw footers at the end
  const pages: any[] = []

  function newPage() {
    const p = doc.addPage([W, H])
    pages.push(p)
    return p
  }

  function drawAllFooters() {
    const totalPages = pages.length
    pages.forEach((p, idx) => {
      p.drawRectangle({ x: 0, y: 0, width: W, height: FOOTER_H, color: lightgrey })
      p.drawText('DISCLAIMER: BuildQuote assists with structuring material quote requests only. It does not make engineering, compliance,', {
        x: 32, y: 44, size: 6.5, font: regular, color: rgb(0.55, 0.55, 0.58)
      })
      p.drawText('quantity, or suitability decisions. All items, quantities and specifications must be reviewed and confirmed by the builder', {
        x: 32, y: 34, size: 6.5, font: regular, color: rgb(0.55, 0.55, 0.58)
      })
      p.drawText('and relevant professionals before ordering. BuildQuote accepts no liability for errors, omissions, or AI parsing inaccuracies.', {
        x: 32, y: 24, size: 6.5, font: regular, color: rgb(0.55, 0.55, 0.58)
      })
      const footerLine = `RFQ Reference: ${rfqId}   |   Sent: ${new Date().toLocaleDateString('en-AU')}   |   buildquote.com.au   |   Page ${idx + 1} of ${totalPages}`
      p.drawText(footerLine, { x: 32, y: 10, size: 7, font: regular, color: grey })
    })
  }

  function drawHeader(page: any): number {
    const companyDisplay = (builder.company || builder.builderName || 'Builder').substring(0, 42)
    page.drawText(companyDisplay, { x: 32, y: H - 36, size: 22, font: bold, color: dark })
    page.drawText('REQUEST FOR QUOTATION', { x: 32, y: H - 54, size: 9, font: bold, color: orange })
    page.drawRectangle({ x: 32, y: H - 59, width: 190, height: 2, color: orange })
    page.drawText(rfqId, { x: W - 140, y: H - 36, size: 9, font: bold, color: orange })
    const dateStr = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
    page.drawText(dateStr, { x: W - 140, y: H - 50, size: 8, font: regular, color: grey })
    page.drawRectangle({ x: 32, y: H - 68, width: W - 64, height: 1, color: rgb(0.88, 0.88, 0.88) })

    let y = H - 90

    // FROM / TO
    page.drawText('FROM', { x: 32, y, size: 8, font: bold, color: orange })
    page.drawText('TO', { x: 300, y, size: 8, font: bold, color: orange })
    y -= 16
    page.drawText(builder.builderName, { x: 32, y, size: 11, font: bold, color: dark })
    page.drawText(supplier.supplierName, { x: 300, y, size: 11, font: bold, color: dark })
    y -= 14
    page.drawText(builder.company, { x: 32, y, size: 10, font: regular, color: grey })
    if (supplier.accountNumber) page.drawText(`Account: ${supplier.accountNumber}`, { x: 300, y, size: 10, font: regular, color: grey })
    y -= 12
    page.drawText(`ABN: ${builder.abn}`, { x: 32, y, size: 10, font: regular, color: grey })
    if (supplier.supplierEmail) page.drawText(supplier.supplierEmail, { x: 300, y, size: 9, font: regular, color: grey })
    y -= 12
    page.drawText(builder.phone, { x: 32, y, size: 10, font: regular, color: grey })
    y -= 12
    page.drawText(builder.email, { x: 32, y, size: 10, font: regular, color: grey })
    if (pmName) {
      y -= 12
      const pmLine = `PM: ${pmName}${pmPhone ? '  ·  ' + pmPhone : ''}`
      page.drawText(pmLine.substring(0, 60), { x: 32, y, size: 10, font: regular, color: grey })
    }
    y -= 20

    // Delivery / Date bar — dynamic height based on visible lines
    const projectRef = payload.projectReference ? `  |  Ref: ${payload.projectReference}` : ''
    const deliveryLine = delivery === 'delivery'
      ? `Delivery${siteAddress ? ': ' + siteAddress : ''}${siteSuburb ? ', ' + siteSuburb : ''}`
      : 'Store Pick-up'
    const dateLine = `Date Required: ${dateRequired || 'ASAP'}${projectRef}`
    const contactLabel = preferredContact === 'phone' ? 'Phone' : preferredContact === 'email' ? 'Email' : 'Phone or Email'
    const barLines: string[] = [deliveryLine, dateLine]
    if (siteAccessNotes && delivery === 'delivery') barLines.push(`Site Access: ${siteAccessNotes}`)
    if (preferredContact) barLines.push(`Preferred Contact: ${contactLabel}`)
    const barHeight = Math.max(40, barLines.length * 12 + 16)
    page.drawRectangle({ x: 32, y: y - barHeight + 16, width: W - 64, height: barHeight, color: lightgrey })
    barLines.forEach((line, idx) => {
      page.drawText(line.substring(0, 95), { x: 40, y: y + 2 - idx * 12, size: 9, font: regular, color: grey })
    })
    y -= barHeight - 12

    return y
  }

  function drawTableHeader(page: any, y: number): number {
    page.drawText('LINE ITEMS', { x: 32, y, size: 8, font: bold, color: orange })
    y -= 14
    page.drawRectangle({ x: 32, y: y - 8, width: W - 64, height: 20, color: dark })
    page.drawText('#', { x: 38, y: y - 2, size: 8, font: bold, color: white })
    page.drawText('Product Name', { x: 58, y: y - 2, size: 8, font: bold, color: white })
    page.drawText('Description / Spec', { x: 210, y: y - 2, size: 8, font: bold, color: white })
    page.drawText('SKU', { x: 390, y: y - 2, size: 8, font: bold, color: white })
    page.drawText('UOM', { x: 455, y: y - 2, size: 8, font: bold, color: white })
    page.drawText('Qty', { x: 505, y: y - 2, size: 8, font: bold, color: white })
    y -= 22
    return y
  }

  const wrapText = (text: string, maxChars: number): string[] => {
    if (text.length <= maxChars) return [text]
    const words = text.split(' ')
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      if ((line + ' ' + word).trim().length > maxChars) {
        if (line) lines.push(line.trim())
        line = word
      } else {
        line = (line + ' ' + word).trim()
      }
    }
    if (line) lines.push(line.trim())
    return lines
  }

  // === BUILD PAGE 1 ===
  let page = newPage()
  let y = drawHeader(page)

  // Message — draw right after delivery/date, before line items
  if (message) {
    y -= 4
    page.drawText('MESSAGE', { x: 32, y, size: 8, font: bold, color: orange })
    y -= 14
    const msgLines = wrapText(message, 90)
    for (const ml of msgLines) {
      if (y < MIN_Y) {
        page = newPage()
        y = H - 48
      }
      page.drawText(ml, { x: 32, y, size: 9, font: regular, color: grey })
      y -= 12
    }
    y -= 8
  }

  // Line items table
  y = drawTableHeader(page, y)

  items.forEach((item, i) => {
    const nameLines = wrapText(item.name || '', 24).slice(0, 3)
    const descLines = item.desc ? wrapText(item.desc, 28).slice(0, 3) : ['']
    const rowHeight = Math.max(18, Math.max(nameLines.length, descLines.length) * 11 + 8)

    if (y - rowHeight < MIN_Y) {
      page = newPage()
      y = drawHeader(page)
      y = drawTableHeader(page, y)
    }

    const bg = i % 2 === 0 ? white : lightgrey
    page.drawRectangle({ x: 32, y: y - rowHeight + 10, width: W - 64, height: rowHeight, color: bg })
    page.drawText(`${i + 1}`, { x: 38, y: y - 2, size: 8, font: regular, color: grey })

    nameLines.forEach((line, li) => {
      page.drawText(line, { x: 58, y: y - 2 - li * 11, size: 8, font: regular, color: dark })
    })

    descLines.forEach((line, li) => {
      if (!line) return
      page.drawText(line, { x: 210, y: y - 2 - li * 11, size: 7, font: regular, color: grey })
    })

    page.drawText((item.sku || '').substring(0, 10), { x: 390, y: y - 2, size: 8, font: regular, color: grey })
    page.drawText((item.uom || '').substring(0, 6), { x: 455, y: y - 2, size: 8, font: regular, color: grey })
    page.drawText((item.qty || '').substring(0, 8), { x: 505, y: y - 2, size: 8, font: regular, color: grey })
    y -= rowHeight
  })

  // Draw footers on all pages with page numbers
  drawAllFooters()

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}
