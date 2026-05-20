export interface LineItem {
  id: string
  name: string
  sku: string
  productId: string
  desc: string
  uom: string
  qty: string
  confidence?: 'high' | 'low'
  length_mm?: number | string | null
  width_mm?: number | string | null
  height_mm?: number | string | null
  thickness_mm?: number | string | null
  depth_mm?: number | string | null
  gauge_mm?: number | string | null
  diameter_mm?: number | string | null
  roll_m?: number | string | null
  weight_kg?: number | string | null
  pieces?: number | string | null
  coverage_m2?: number | string | null
}

export interface BuilderDetails {
  builderName: string
  company: string
  abn: string
  phone: string
  email: string
}

export interface SupplierDetails {
  supplierName: string
  supplierEmail: string
  accountNumber: string
}

export interface RFQPayload {
  rfqId: string
  builderId?: string
  builder: BuilderDetails
  supplier: SupplierDetails
  items: LineItem[]
  delivery: 'delivery' | 'pickup'
  dateRequired: string
  message: string
  projectReference: string
  siteAddress?: string
  siteSuburb?: string
  sendToSupplier: boolean
  sendCopyToSelf: boolean
}
