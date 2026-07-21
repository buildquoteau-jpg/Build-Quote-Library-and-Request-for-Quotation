import { RFQPayload } from './types'
import { formatDate, formatDateRequired } from './dateUtils'

export function buildEmailHtml(payload: RFQPayload): string {
  const { builder, supplier, items, delivery, dateRequired, message, rfqId, pmName, pmPhone, siteAccessNotes, preferredContact } = payload

  const itemRows = items.map((item, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f5f7f9'
    return `
    <tr style="background:${bg};">
      <td style="padding:8px 10px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
      <td style="padding:8px 10px;font-size:13px;color:#000000;border-bottom:1px solid #e2e8f0;">${item.name}</td>
      <td style="padding:8px 10px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0;">${item.desc || ''}</td>
      <td style="padding:8px 10px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0;">${item.sku || ''}</td>
      <td style="padding:8px 10px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0;">${item.uom}</td>
      <td style="padding:8px 10px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e2e8f0;">${item.qty}</td>
    </tr>`
  }).join('')

  const dateStr = formatDate()
  const companyDisplay = (builder.company || builder.builderName || 'Builder').substring(0, 42)
  const deliveryLine = delivery === 'delivery'
    ? `Delivery${payload.siteAddress ? ': ' + payload.siteAddress : ''}${payload.siteSuburb ? ', ' + payload.siteSuburb : ''}`
    : 'Store Pick-up'
  const projectRef = payload.projectReference ? `  |  Ref: ${payload.projectReference}` : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f7f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7f9;padding:24px 0;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <tr>
    <td style="background:#185D7A;padding:20px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${companyDisplay}</p>
            <p style="margin:2px 0 0;font-size:9px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1.5px;">Request for Quotation</p>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <p style="margin:0;font-size:13px;font-weight:700;color:#f97316;">${rfqId}</p>
            <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);">${dateStr}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ORANGE ACCENT BAR -->
  <tr><td style="background:#f97316;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- GREETING -->
  <tr>
    <td style="padding:24px 32px 0;">
      <p style="margin:0 0 6px;font-size:15px;color:#0f172a;">Dear ${supplier.supplierName || 'Supplier'},</p>
      <p style="margin:0;font-size:13px;color:#334155;line-height:1.5;">
        You have received a request for quotation for building materials from <strong>${builder.builderName}</strong>.
        Please correspond directly with ${builder.builderName} to acknowledge this request for quotation.
      </p>
    </td>
  </tr>

  <!-- FROM / TO -->
  <tr>
    <td style="padding:16px 32px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:16px;">
            <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1.5px;">From</p>
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#185D7A;">${builder.builderName}</p>
            <p style="margin:0 0 1px;font-size:12px;color:#64748b;">${builder.company}</p>
            <p style="margin:0 0 1px;font-size:12px;color:#64748b;">ABN: ${builder.abn}</p>
            <p style="margin:0 0 1px;font-size:12px;color:#64748b;">${builder.phone}</p>
            <p style="margin:0 0 1px;font-size:12px;color:#64748b;">${builder.email}</p>
            ${pmName ? `<p style="margin:4px 0 1px;font-size:12px;color:#334155;"><strong>PM:</strong> ${pmName}${pmPhone ? ' · ' + pmPhone : ''}</p>` : ''}
          </td>
          <td style="width:50%;vertical-align:top;">
            <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1.5px;">To</p>
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#185D7A;">${supplier.supplierName}</p>
            ${supplier.accountNumber ? `<p style="margin:0 0 1px;font-size:12px;color:#64748b;">Account: ${supplier.accountNumber}</p>` : ''}
            ${supplier.supplierEmail ? `<p style="margin:0;font-size:12px;color:#64748b;">${supplier.supplierEmail}</p>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- DIVIDER -->
  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;"></div></td></tr>

  <!-- DELIVERY / DATE -->
  <tr>
    <td style="padding:16px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7f9;border-radius:6px;">
        <tr>
          <td style="padding:12px 16px;">
            <p style="margin:0 0 4px;font-size:12px;color:#64748b;"><strong style="color:#334155;">Delivery:</strong> ${deliveryLine}</p>
            <p style="margin:0 0 4px;font-size:12px;color:#64748b;"><strong style="color:#334155;">Date Required:</strong> ${formatDateRequired(dateRequired)}${projectRef}</p>
            ${siteAccessNotes && delivery === 'delivery' ? `<p style="margin:0 0 4px;font-size:12px;color:#64748b;"><strong style="color:#334155;">Site Access:</strong> ${siteAccessNotes}</p>` : ''}
            ${preferredContact ? `<p style="margin:0;font-size:12px;color:#64748b;"><strong style="color:#334155;">Preferred Contact:</strong> ${preferredContact === 'phone' ? 'Phone' : preferredContact === 'email' ? 'Email' : 'Phone or Email'}</p>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- LINE ITEMS LABEL -->
  <tr>
    <td style="padding:8px 32px 8px;">
      <p style="margin:0;font-size:10px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1.5px;">Line Items</p>
    </td>
  </tr>

  <!-- LINE ITEMS TABLE -->
  <tr>
    <td style="padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr style="background:#185D7A;">
            <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;">#</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;">Product</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;">Description</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;">SKU</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;">UOM</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;">Qty</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </td>
  </tr>

  ${message ? `
  <!-- MESSAGE -->
  <tr>
    <td style="padding:0 32px 24px;">
      <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1.5px;">Message</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7f9;border-radius:6px;">
        <tr><td style="padding:12px 16px;font-size:13px;color:#334155;line-height:1.5;">${message}</td></tr>
      </table>
    </td>
  </tr>
  ` : ''}

  <!-- DIVIDER -->
  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e2e8f0;"></div></td></tr>

  <!-- RFQ REFERENCE -->
  <tr>
    <td style="padding:16px 32px;">
      <p style="margin:0 0 2px;font-size:12px;color:#64748b;"><strong style="color:#334155;">RFQ Reference:</strong> ${rfqId}</p>
      <p style="margin:0;font-size:12px;color:#64748b;"><strong style="color:#334155;">Sent:</strong> ${formatDate()}</p>
    </td>
  </tr>

  <!-- WHAT HAPPENS NEXT -->
  <tr>
    <td style="background:#fff8f0;border-top:2px solid #f97316;padding:20px 32px;">
      <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1.5px;">What Happens Next</p>
      <p style="margin:0 0 6px;font-size:12px;color:#334155;line-height:1.5;">This RFQ has been sent directly to <strong>${supplier.supplierName}</strong>. All further communication regarding pricing, availability, lead times, and order confirmation should take place directly between the builder and the supplier.</p>
      <p style="margin:0;font-size:12px;color:#334155;line-height:1.5;">The supplier will respond directly to <strong>${builder.email}</strong>. Please review the supplier&#39;s quote carefully before placing any order.</p>
    </td>
  </tr>

  <!-- DISCLAIMER FOOTER -->
  <tr>
    <td style="background:#f5f7f9;border-top:1px solid #e2e8f0;padding:16px 32px;">
      <p style="margin:0 0 8px;font-size:10px;color:#94a3b8;line-height:1.5;"><strong style="color:#64748b;">Disclaimer:</strong> BuildQuote assists with structuring material quote requests only. It does not make engineering, compliance, quantity, or suitability decisions. All line items, quantities, specifications and descriptions in this document must be independently reviewed and confirmed by the builder and relevant professionals before any order is placed. BuildQuote accepts no liability for errors, omissions, or AI parsing inaccuracies.</p>
      <p style="margin:0;font-size:10px;color:#94a3b8;">Sent via <strong style="color:#f97316;">BuildQuote</strong> &mdash; buildquote.com.au</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
