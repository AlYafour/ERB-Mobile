// Common Types

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  is_staff?: boolean;
  is_active?: boolean;
  date_joined?: string;
  [key: string]: any;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  [key: string]: any;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  unit_price?: number;
  category?: string;
  [key: string]: any;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  [key: string]: any;
}

export interface PurchaseRequest {
  id: string;
  request_number?: string;
  project?: string | Project;
  requested_by?: string | User;
  status?: string;
  items?: PurchaseRequestItem[];
  created_at?: string;
  [key: string]: any;
}

export interface PurchaseRequestItem {
  id: string;
  product?: string | Product;
  quantity?: number;
  unit_price?: number;
  [key: string]: any;
}

export interface PurchaseQuotation {
  id: string;
  quotation_number?: string;
  supplier?: string | Supplier;
  purchase_request?: string | PurchaseRequest;
  status?: string;
  items?: PurchaseQuotationItem[];
  total_amount?: number;
  created_at?: string;
  [key: string]: any;
}

export interface PurchaseQuotationItem {
  id: string;
  product?: string | Product;
  quantity?: number;
  unit_price?: number;
  [key: string]: any;
}

export interface QuotationRequest {
  id: string;
  request_number?: string;
  purchase_request?: string | PurchaseRequest;
  suppliers?: string[] | Supplier[];
  status?: string;
  created_at?: string;
  [key: string]: any;
}

export interface PurchaseOrder {
  id: string;
  order_number?: string;
  supplier?: string | Supplier;
  purchase_quotation?: string | PurchaseQuotation;
  status?: string;
  items?: PurchaseOrderItem[];
  total_amount?: number;
  created_at?: string;
  [key: string]: any;
}

export interface PurchaseOrderItem {
  id: string;
  product?: string | Product;
  quantity?: number;
  unit_price?: number;
  [key: string]: any;
}

export interface PurchaseInvoice {
  id: string;
  invoice_number?: string;
  purchase_order?: string | PurchaseOrder;
  supplier?: string | Supplier;
  status?: string;
  items?: PurchaseInvoiceItem[];
  total_amount?: number;
  created_at?: string;
  [key: string]: any;
}

export interface PurchaseInvoiceItem {
  id: string;
  product?: string | Product;
  quantity?: number;
  unit_price?: number;
  [key: string]: any;
}

export interface GoodsReceiving {
  id: string;
  receipt_number?: string;
  purchase_order?: string | PurchaseOrder;
  received_by?: string | User;
  status?: string;
  items?: GoodsReceivingItem[];
  received_at?: string;
  [key: string]: any;
}

export interface GoodsReceivingItem {
  id: string;
  product?: string | Product;
  quantity_received?: number;
  condition?: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type?: string;
  is_read?: boolean;
  created_at?: string;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

