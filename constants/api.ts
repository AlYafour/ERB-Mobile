// API Configuration
export const API_BASE_URL = 'https://f8052704cce76791-2-50-176-172.serveousercontent.com';

export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/api/auth/login/',
  REGISTER: '/api/auth/register/',
  LOGOUT: '/api/auth/logout/',
  REFRESH_TOKEN: '/api/auth/refresh/',
  USER_PROFILE: '/api/auth/user/',
  
  // Users
  USERS: '/api/users/',
  USER_DETAIL: (id: string) => `/api/users/${id}/`,
  
  // Suppliers
  SUPPLIERS: '/api/suppliers/',
  SUPPLIER_DETAIL: (id: string) => `/api/suppliers/${id}/`,
  
  // Products
  PRODUCTS: '/api/products/',
  PRODUCT_DETAIL: (id: string) => `/api/products/${id}/`,
  
  // Projects
  PROJECTS: '/api/projects/',
  PROJECT_DETAIL: (id: string) => `/api/projects/${id}/`,
  
  // Goods Receiving
  GOODS_RECEIVING: '/api/goods-receiving/',
  GOODS_RECEIVING_DETAIL: (id: string) => `/api/goods-receiving/${id}/`,
  
  // Purchase Requests
  PURCHASE_REQUESTS: '/api/purchase-requests/',
  PURCHASE_REQUEST_DETAIL: (id: string) => `/api/purchase-requests/${id}/`,
  
  // Purchase Quotations
  PURCHASE_QUOTATIONS: '/api/purchase-quotations/',
  PURCHASE_QUOTATION_DETAIL: (id: string) => `/api/purchase-quotations/${id}/`,
  
  // Quotation Requests
  QUOTATION_REQUESTS: '/api/quotation-requests/',
  QUOTATION_REQUEST_DETAIL: (id: string) => `/api/quotation-requests/${id}/`,
  
  // Purchase Orders
  PURCHASE_ORDERS: '/api/purchase-orders/',
  PURCHASE_ORDER_DETAIL: (id: string) => `/api/purchase-orders/${id}/`,
  
  // Purchase Invoices
  PURCHASE_INVOICES: '/api/purchase-invoices/',
  PURCHASE_INVOICE_DETAIL: (id: string) => `/api/purchase-invoices/${id}/`,
  
  // Notifications
  NOTIFICATIONS: '/api/notifications/',
  NOTIFICATION_DETAIL: (id: string) => `/api/notifications/${id}/`,
  MARK_NOTIFICATION_READ: (id: string) => `/api/notifications/${id}/read/`,
};

