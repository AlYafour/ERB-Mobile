import { ModuleTints } from './theme';

export type ProcurementDocType =
  | 'purchase_request'
  | 'purchase_order'
  | 'quotation_request'
  | 'purchase_quotation'
  | 'goods_receiving'
  | 'purchase_invoice'
  | 'product'
  | 'supplier';

type TintKey = keyof typeof ModuleTints.light;

/**
 * One icon + tint per document type across the whole procurement module.
 * The tint groups documents by role in the cycle, not by screen:
 *   procurement (gold) — the active workflow chain: PR → QR → PQ → PO
 *   operations  (muted) — physical fulfillment: GRN
 *   finance     (amber) — money changing hands: Invoice
 *   admin       (ink)   — reference/master data: Product, Supplier
 * Reusing ModuleTints (constants/theme.ts) keeps this on the same palette
 * as the HR request tiles and the home dashboard's module cards — one
 * color language across the app, not a one-off procurement scheme.
 */
export const DOCUMENT_TYPE_META: Record<ProcurementDocType, { icon: string; tint: TintKey; label: string }> = {
  purchase_request:   { icon: 'doc.text.fill',            tint: 'procurement', label: 'Purchase Request' },
  purchase_order:     { icon: 'cart.fill',                tint: 'procurement', label: 'Purchase Order' },
  quotation_request:  { icon: 'list.bullet.rectangle.fill', tint: 'procurement', label: 'Quotation Request' },
  purchase_quotation: { icon: 'quote.bubble.fill',        tint: 'procurement', label: 'Purchase Quotation' },
  goods_receiving:    { icon: 'shippingbox.fill',         tint: 'operations',  label: 'Goods Receiving' },
  purchase_invoice:   { icon: 'dollarsign.circle.fill',   tint: 'finance',     label: 'Purchase Invoice' },
  product:            { icon: 'cube.box.fill',            tint: 'admin',       label: 'Product' },
  supplier:           { icon: 'building.2.fill',           tint: 'admin',       label: 'Supplier' },
};
