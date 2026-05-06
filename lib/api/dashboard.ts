import { apiClient } from '../api';
import { purchaseRequestsApi } from './purchase-requests';
import { purchaseQuotationsApi } from './purchase-quotations';
import { purchaseOrdersApi } from './purchase-orders';
import { goodsReceivingApi } from './goods-receiving';
import { purchaseInvoicesApi } from './purchase-invoices';
import { suppliersApi } from './suppliers';
import { productsApi } from './products';
import { projectsApi } from './projects';
import { quotationRequestsApi } from './quotation-requests';
import { usersApi } from './users';

export interface DashboardStats {
  purchaseRequests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  quotationRequests: {
    total: number;
    pending: number;
    completed: number;
  };
  suppliers: {
    total: number;
  };
  products: {
    total: number;
  };
  purchaseOrders: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
  };
  goodsReceiving: {
    total: number;
  };
  invoices: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
  };
}

export interface ProjectAnalytics {
  id: number;
  name: string;
  code: string;
  totalSpending: number;
  poCount: number;
  progress: number;
}

export interface UserActivity {
  id: number;
  username: string;
  createdPR: number;
  approvedRequests: number;
  createdPO: number;
  createdInvoices: number;
}

export interface ProcurementCycleMetrics {
  avgPRToPO: number;
  avgPOToGRN: number;
  avgGRNToInvoice: number;
  bottlenecks: Array<{
    stage: string;
    avgDays: number;
    count: number;
  }>;
}

export interface ChartData {
  monthlyProcurement: Array<{
    month: string;
    volume: number;
    count: number;
  }>;
  monthlyInvoices: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
  projectSpending: Array<{
    project: string;
    spending: number;
  }>;
  supplierComparison: Array<{
    supplier: string;
    poCount: number;
    totalAmount: number;
  }>;
  statusDistribution: {
    purchaseRequests: { pending: number; approved: number; rejected: number };
    purchaseOrders: { pending: number; approved: number; rejected: number; completed: number };
    invoices: { pending: number; approved: number; paid: number };
  };
}

export interface RecentActivity {
  id: number;
  type: 'purchase_request' | 'quotation' | 'purchase_order' | 'grn' | 'invoice';
  action: 'created' | 'approved' | 'rejected' | 'paid';
  title: string;
  user: string;
  timestamp: string;
  link: string;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const safeGet = async (apiCall: () => Promise<any>, defaultValue: any = { count: 0 }) => {
      try {
        return await apiCall();
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        const isPermissionError = 
          errorMessage.includes('permission') || 
          errorMessage.includes('Not Found') ||
          errorMessage.includes('403') ||
          errorMessage.includes('404');
        
        if (!isPermissionError && __DEV__) {
          console.warn('Error fetching stats:', error);
        }
        return defaultValue;
      }
    };

    const [
      purchaseRequests,
      quotationRequests,
      suppliers,
      products,
      purchaseOrders,
      goodsReceiving,
      invoices,
    ] = await Promise.all([
      safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1 })),
      safeGet(() => quotationRequestsApi.getAll({ page: 1, page_size: 1 })),
      safeGet(() => suppliersApi.getAll({ page: 1, page_size: 1 })),
      safeGet(() => productsApi.getAll({ page: 1, page_size: 1 })),
      safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1 })),
      safeGet(() => goodsReceivingApi.getAll({ page: 1, page_size: 1 })),
      safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1 })),
    ]);

    const prPending = await safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1, status: 'pending' }));
    const prApproved = await safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1, status: 'approved' }));
    const prRejected = await safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1, status: 'rejected' }));

    const qrPending = await safeGet(() => quotationRequestsApi.getAll({ page: 1, page_size: 1, status: 'pending' }));
    const qrCompleted = await safeGet(() => quotationRequestsApi.getAll({ page: 1, page_size: 1, status: 'completed' }));

    const poPending = await safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1, status: 'pending' }));
    const poApproved = await safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1, status: 'approved' }));
    const poRejected = await safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1, status: 'rejected' }));
    const poCompleted = await safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1, status: 'completed' }));

    const invPending = await safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1, status: 'pending' }));
    const invApproved = await safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1, status: 'approved' }));
    const invPaid = await safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1, status: 'paid' }));

    return {
      purchaseRequests: {
        total: purchaseRequests.count || 0,
        pending: prPending.count || 0,
        approved: prApproved.count || 0,
        rejected: prRejected.count || 0,
      },
      quotationRequests: {
        total: quotationRequests.count || 0,
        pending: qrPending.count || 0,
        completed: qrCompleted.count || 0,
      },
      suppliers: {
        total: suppliers.count || 0,
      },
      products: {
        total: products.count || 0,
      },
      purchaseOrders: {
        total: purchaseOrders.count || 0,
        pending: poPending.count || 0,
        approved: poApproved.count || 0,
        rejected: poRejected.count || 0,
        completed: poCompleted.count || 0,
      },
      goodsReceiving: {
        total: goodsReceiving.count || 0,
      },
      invoices: {
        total: invoices.count || 0,
        pending: invPending.count || 0,
        approved: invApproved.count || 0,
        paid: invPaid.count || 0,
      },
    };
  },

  getProjectAnalytics: async (): Promise<ProjectAnalytics[]> => {
    try {
      const projects = await projectsApi.getAll({ page: 1, page_size: 100 });
      
      const analytics: ProjectAnalytics[] = [];
      
      for (const project of projects.results || []) {
        try {
          const projectPRs = await purchaseRequestsApi.getAll({ 
            page: 1, 
            page_size: 1000,
            project: Number(project.id) 
          });
          
          const allPOs = await purchaseOrdersApi.getAll({ 
            page: 1, 
            page_size: 1000,
          });
          
          const projectPRIds = (projectPRs.results || []).map(pr => Number(pr.id));
          const projectPOs = {
            results: (allPOs.results || []).filter((po: any) => 
              projectPRIds.includes(Number(po.purchase_request))
            ),
            count: 0,
          };
          projectPOs.count = projectPOs.results.length;

          let totalSpending = 0;
          for (const po of projectPOs.results || []) {
            totalSpending += (po as any).total || 0;
          }

          analytics.push({
            id: Number(project.id),
            name: project.name,
            code: (project as any).code || '',
            totalSpending,
            poCount: projectPOs.count || 0,
            progress: 0,
          });
        } catch (error: any) {
          // Silently skip this project if there's a permission error
          const errorMessage = error?.message || String(error);
          const isPermissionError = 
            errorMessage.includes('permission') || 
            errorMessage.includes('Not Found') ||
            errorMessage.includes('403') ||
            errorMessage.includes('404');
          
          if (!isPermissionError && __DEV__) {
            console.warn(`Error fetching analytics for project ${project.id}:`, error);
          }
        }
      }

      return analytics.sort((a, b) => b.totalSpending - a.totalSpending).slice(0, 10);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isPermissionError = 
        errorMessage.includes('permission') || 
        errorMessage.includes('Not Found') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');
      
      if (!isPermissionError && __DEV__) {
        console.warn('Error fetching project analytics:', error);
      }
      return [];
    }
  },

  getRecentActivity: async (): Promise<RecentActivity[]> => {
    try {
      const activities: RecentActivity[] = [];
      
      try {
        const prs = await purchaseRequestsApi.getAll({ page: 1, page_size: 10 });
        for (const pr of prs.results || []) {
          activities.push({
            id: Number(pr.id),
            type: 'purchase_request',
            action: pr.status === 'approved' ? 'approved' : pr.status === 'rejected' ? 'rejected' : 'created',
            title: (pr as any).title || (pr as any).code || '',
            user: (pr as any).created_by_name || 'Unknown',
            timestamp: (pr as any).created_at || '',
            link: `/purchase-requests/${pr.id}`,
          });
        }
      } catch (error: any) {
        // Silently skip if no permission
        const errorMessage = error?.message || String(error);
        const isPermissionError = 
          errorMessage.includes('permission') || 
          errorMessage.includes('Not Found') ||
          errorMessage.includes('403') ||
          errorMessage.includes('404');
        
        if (!isPermissionError && __DEV__) {
          console.warn('Error fetching purchase requests for activity:', error);
        }
      }

      try {
        const pos = await purchaseOrdersApi.getAll({ page: 1, page_size: 10 });
        for (const po of pos.results || []) {
          activities.push({
            id: Number(po.id),
            type: 'purchase_order',
            action: (po as any).status === 'approved' ? 'approved' : (po as any).status === 'rejected' ? 'rejected' : 'created',
            title: (po as any).order_number || `PO #${po.id}`,
            user: (po as any).created_by_name || 'Unknown',
            timestamp: (po as any).created_at || '',
            link: `/purchase-orders/${po.id}`,
          });
        }
      } catch (error: any) {
        // Silently skip if no permission
        const errorMessage = error?.message || String(error);
        const isPermissionError = 
          errorMessage.includes('permission') || 
          errorMessage.includes('Not Found') ||
          errorMessage.includes('403') ||
          errorMessage.includes('404');
        
        if (!isPermissionError && __DEV__) {
          console.warn('Error fetching purchase orders for activity:', error);
        }
      }

      try {
        const invoices = await purchaseInvoicesApi.getAll({ page: 1, page_size: 10 });
        for (const inv of invoices.results || []) {
          activities.push({
            id: Number(inv.id),
            type: 'invoice',
            action: inv.status === 'paid' ? 'paid' : inv.status === 'approved' ? 'approved' : 'created',
            title: (inv as any).invoice_number || '',
            user: (inv as any).created_by_name || 'Unknown',
            timestamp: (inv as any).invoice_date || '',
            link: `/purchase-invoices/${inv.id}`,
          });
        }
      } catch (error: any) {
        // Silently skip if no permission
        const errorMessage = error?.message || String(error);
        const isPermissionError = 
          errorMessage.includes('permission') || 
          errorMessage.includes('Not Found') ||
          errorMessage.includes('403') ||
          errorMessage.includes('404');
        
        if (!isPermissionError && __DEV__) {
          console.warn('Error fetching invoices for activity:', error);
        }
      }

      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isPermissionError = 
        errorMessage.includes('permission') || 
        errorMessage.includes('Not Found') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');
      
      if (!isPermissionError && __DEV__) {
        console.warn('Error fetching recent activity:', error);
      }
      return [];
    }
  },

  getUserActivity: async (): Promise<UserActivity[]> => {
    try {
      const users = await usersApi.getAll({ page: 1, page_size: 100 });
      const activities: UserActivity[] = [];

      for (const user of users.results || []) {
        try {
          const userPRs = await purchaseRequestsApi.getAll({ 
            page: 1, 
            page_size: 1000,
            created_by: Number(user.id) 
          });

          const approvedPRs = await purchaseRequestsApi.getAll({ 
            page: 1, 
            page_size: 1000,
            approved_by: Number(user.id),
            status: 'approved'
          });

          const userPOs = await purchaseOrdersApi.getAll({ 
            page: 1, 
            page_size: 1000,
            created_by: Number(user.id) 
          });

          const userInvoices = await purchaseInvoicesApi.getAll({ 
            page: 1, 
            page_size: 1000,
            created_by: Number(user.id) 
          });

          const totalActivity = 
            (userPRs.count || 0) + 
            (approvedPRs.count || 0) + 
            (userPOs.count || 0) + 
            (userInvoices.count || 0);

          if (totalActivity > 0) {
            activities.push({
              id: Number(user.id),
              username: user.username || '',
              createdPR: userPRs.count || 0,
              approvedRequests: approvedPRs.count || 0,
              createdPO: userPOs.count || 0,
              createdInvoices: userInvoices.count || 0,
            });
          }
        } catch (error: any) {
          // Silently skip this user if there's a permission error or not found
          const errorMessage = error?.message || String(error);
          const isPermissionError = 
            errorMessage.includes('permission') || 
            errorMessage.includes('Not Found') ||
            errorMessage.includes('403') ||
            errorMessage.includes('404');
          
          if (!isPermissionError) {
            // Only log non-permission errors in development
            if (__DEV__) {
              console.warn(`Error fetching activity for user ${user.id}:`, error);
            }
          }
        }
      }

      return activities
        .sort((a, b) => {
          const totalA = a.createdPR + a.approvedRequests + a.createdPO + a.createdInvoices;
          const totalB = b.createdPR + b.approvedRequests + b.createdPO + b.createdInvoices;
          return totalB - totalA;
        })
        .slice(0, 10);
    } catch (error: any) {
      // Silently return empty array for permission errors
      const errorMessage = error?.message || String(error);
      const isPermissionError = 
        errorMessage.includes('permission') || 
        errorMessage.includes('Not Found') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');
      
      if (!isPermissionError && __DEV__) {
        console.warn('Error fetching user activity:', error);
      }
      return [];
    }
  },

  getProcurementCycleMetrics: async (): Promise<ProcurementCycleMetrics> => {
    try {
      const safeGet = async (apiCall: () => Promise<any>, defaultValue: any = { results: [], count: 0 }) => {
        try {
          return await apiCall();
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          const isPermissionError = 
            errorMessage.includes('permission') || 
            errorMessage.includes('Not Found') ||
            errorMessage.includes('403') ||
            errorMessage.includes('404');
          
          if (!isPermissionError && __DEV__) {
            console.warn('Error fetching cycle metrics:', error);
          }
          return defaultValue;
        }
      };

      const [allPOs, allPRs, allGRNs, allInvoices] = await Promise.all([
        safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1000 })),
        safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1000 })),
        safeGet(() => goodsReceivingApi.getAll({ page: 1, page_size: 1000 })),
        safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1000 })),
      ]);

    let totalPRToPODays = 0;
    let prToPOCount = 0;
    let totalPOToGRNDays = 0;
    let poToGRNCount = 0;
    let totalGRNToInvoiceDays = 0;
    let grnToInvoiceCount = 0;

    for (const po of allPOs.results || []) {
      if ((po as any).purchase_request) {
        const pr = (allPRs.results || []).find((p: any) => Number(p.id) === Number((po as any).purchase_request));
        if (pr && (pr as any).created_at && (po as any).created_at) {
          const prDate = new Date((pr as any).created_at);
          const poDate = new Date((po as any).created_at);
          const days = Math.floor((poDate.getTime() - prDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            totalPRToPODays += days;
            prToPOCount++;
          }
        }
      }
    }

    for (const grn of allGRNs.results || []) {
      if ((grn as any).purchase_order_id) {
        const po = (allPOs.results || []).find((p: any) => Number(p.id) === Number((grn as any).purchase_order_id));
        if (po && (po as any).created_at && (grn as any).receipt_date) {
          const poDate = new Date((po as any).created_at);
          const grnDate = new Date((grn as any).receipt_date);
          const days = Math.floor((grnDate.getTime() - poDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            totalPOToGRNDays += days;
            poToGRNCount++;
          }
        }
      }
    }

    for (const invoice of allInvoices.results || []) {
      if ((invoice as any).grn_id) {
        const grn = (allGRNs.results || []).find((g: any) => Number(g.id) === Number((invoice as any).grn_id));
        if (grn && (grn as any).receipt_date && (invoice as any).invoice_date) {
          const grnDate = new Date((grn as any).receipt_date);
          const invDate = new Date((invoice as any).invoice_date);
          const days = Math.floor((invDate.getTime() - grnDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            totalGRNToInvoiceDays += days;
            grnToInvoiceCount++;
          }
        }
      }
    }

    const bottlenecks = [
      {
        stage: 'PR → PO',
        avgDays: prToPOCount > 0 ? Math.round(totalPRToPODays / prToPOCount) : 0,
        count: prToPOCount,
      },
      {
        stage: 'PO → GRN',
        avgDays: poToGRNCount > 0 ? Math.round(totalPOToGRNDays / poToGRNCount) : 0,
        count: poToGRNCount,
      },
      {
        stage: 'GRN → Invoice',
        avgDays: grnToInvoiceCount > 0 ? Math.round(totalGRNToInvoiceDays / grnToInvoiceCount) : 0,
        count: grnToInvoiceCount,
      },
    ];

      return {
        avgPRToPO: prToPOCount > 0 ? Math.round(totalPRToPODays / prToPOCount) : 0,
        avgPOToGRN: poToGRNCount > 0 ? Math.round(totalPOToGRNDays / poToGRNCount) : 0,
        avgGRNToInvoice: grnToInvoiceCount > 0 ? Math.round(totalGRNToInvoiceDays / grnToInvoiceCount) : 0,
        bottlenecks: bottlenecks.sort((a, b) => b.avgDays - a.avgDays),
      };
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isPermissionError = 
        errorMessage.includes('permission') || 
        errorMessage.includes('Not Found') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');
      
      if (!isPermissionError && __DEV__) {
        console.warn('Error fetching procurement cycle metrics:', error);
      }
      return {
        avgPRToPO: 0,
        avgPOToGRN: 0,
        avgGRNToInvoice: 0,
        bottlenecks: [],
      };
    }
  },

  getChartData: async (): Promise<ChartData> => {
    try {
      const safeGet = async (apiCall: () => Promise<any>, defaultValue: any = { results: [], count: 0 }) => {
        try {
          return await apiCall();
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          const isPermissionError = 
            errorMessage.includes('permission') || 
            errorMessage.includes('Not Found') ||
            errorMessage.includes('403') ||
            errorMessage.includes('404');
          
          if (!isPermissionError && __DEV__) {
            console.warn('Error fetching chart data:', error);
          }
          return defaultValue;
        }
      };

      const [allPRs, allPOs, allInvoices, allProjects, allSuppliers] = await Promise.all([
        safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1000 })),
        safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1000 })),
        safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1000 })),
        safeGet(() => projectsApi.getAll({ page: 1, page_size: 100 })),
        safeGet(() => suppliersApi.getAll({ page: 1, page_size: 1000 })),
      ]);

    const monthlyProcurementMap = new Map<string, { volume: number; count: number }>();
    for (const pr of allPRs.results || []) {
      if ((pr as any).created_at) {
        const date = new Date((pr as any).created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyProcurementMap.get(monthKey) || { volume: 0, count: 0 };
        monthlyProcurementMap.set(monthKey, {
          volume: current.volume + 1,
          count: current.count + 1,
        });
      }
    }

    const monthlyInvoicesMap = new Map<string, { count: number; amount: number }>();
    for (const inv of allInvoices.results || []) {
      if ((inv as any).invoice_date) {
        const date = new Date((inv as any).invoice_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyInvoicesMap.get(monthKey) || { count: 0, amount: 0 };
        monthlyInvoicesMap.set(monthKey, {
          count: current.count + 1,
          amount: current.amount + ((inv as any).total || 0),
        });
      }
    }

      const projectSpendingMap = new Map<string, number>();
      for (const project of allProjects.results || []) {
        try {
          const projectPRs = await safeGet(() => purchaseRequestsApi.getAll({ 
            page: 1, 
            page_size: 1000,
            project: Number(project.id) 
          }));
          const projectPRIds = (projectPRs.results || []).map(pr => Number(pr.id));
          const projectPOs = (allPOs.results || []).filter((po: any) => 
            projectPRIds.includes(Number(po.purchase_request))
          );
          let totalSpending = 0;
          for (const po of projectPOs) {
            totalSpending += ((po as any).total || 0);
          }
          if (totalSpending > 0) {
            projectSpendingMap.set(project.name, totalSpending);
          }
        } catch (error: any) {
          // Silently skip this project
          const errorMessage = error?.message || String(error);
          const isPermissionError = 
            errorMessage.includes('permission') || 
            errorMessage.includes('Not Found') ||
            errorMessage.includes('403') ||
            errorMessage.includes('404');
          
          if (!isPermissionError && __DEV__) {
            console.warn(`Error fetching project spending for ${project.id}:`, error);
          }
        }
      }

      const supplierMap = new Map<string, { poCount: number; totalAmount: number }>();
      for (const supplier of allSuppliers.results || []) {
        const supplierPOs = (allPOs.results || []).filter((po: any) => 
          Number(po.supplier) === Number(supplier.id)
        );
        let totalAmount = 0;
        for (const po of supplierPOs) {
          totalAmount += ((po as any).total || 0);
        }
        if (supplierPOs.length > 0) {
          supplierMap.set(supplier.name, {
            poCount: supplierPOs.length,
            totalAmount,
          });
        }
      }

      const prStatus = {
        pending: (await safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1, status: 'pending' }))).count || 0,
        approved: (await safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1, status: 'approved' }))).count || 0,
        rejected: (await safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1, status: 'rejected' }))).count || 0,
      };

      const poStatus = {
        pending: (await safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1, status: 'pending' }))).count || 0,
        approved: (await safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1, status: 'approved' }))).count || 0,
        rejected: (await safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1, status: 'rejected' }))).count || 0,
        completed: (await safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1, status: 'completed' }))).count || 0,
      };

      const invStatus = {
        pending: (await safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1, status: 'pending' }))).count || 0,
        approved: (await safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1, status: 'approved' }))).count || 0,
        paid: (await safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1, status: 'paid' }))).count || 0,
      };

      return {
      monthlyProcurement: Array.from(monthlyProcurementMap.entries())
        .map(([key, value]) => {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return {
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            volume: value.volume,
            count: value.count,
          };
        })
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-12),
      monthlyInvoices: Array.from(monthlyInvoicesMap.entries())
        .map(([key, value]) => {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return {
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            count: value.count,
            amount: value.amount,
          };
        })
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-12),
      projectSpending: Array.from(projectSpendingMap.entries())
        .map(([project, spending]) => ({ project, spending }))
        .sort((a, b) => b.spending - a.spending)
        .slice(0, 10),
      supplierComparison: Array.from(supplierMap.entries())
        .map(([supplier, data]) => ({
          supplier,
          poCount: data.poCount,
          totalAmount: data.totalAmount,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10),
        statusDistribution: {
          purchaseRequests: prStatus,
          purchaseOrders: poStatus,
          invoices: invStatus,
        },
      };
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isPermissionError = 
        errorMessage.includes('permission') || 
        errorMessage.includes('Not Found') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');
      
      if (!isPermissionError && __DEV__) {
        console.warn('Error fetching chart data:', error);
      }
      return {
        monthlyProcurement: [],
        monthlyInvoices: [],
        projectSpending: [],
        supplierComparison: [],
        statusDistribution: {
          purchaseRequests: { pending: 0, approved: 0, rejected: 0 },
          purchaseOrders: { pending: 0, approved: 0, rejected: 0, completed: 0 },
          invoices: { pending: 0, approved: 0, paid: 0 },
        },
      };
    }
  },
};

