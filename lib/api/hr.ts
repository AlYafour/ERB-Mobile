import { apiClient } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { PaginatedResponse } from '@/types';

export interface HREmployee {
  id: number;
  employee_id: string;
  full_name: string;
  email: string;
  avatar: string | null;
  department_name: string | null;
  position_title: string | null;
  employment_type: string;
  is_active: boolean;
  join_date: string;
  basic_salary: string;
  total_salary: string;
}

export interface HRAttendance {
  id: number;
  employee: number;
  employee_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_address: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'holiday' | 'on_leave';
  work_hours: number | null;
  overtime_hours: number | null;
  notes: string;
}

export interface HRRequest {
  id: number;
  employee: number;
  employee_name: string;
  request_type: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  days: string | null;
  reason: string;
  approver_name: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  reject_reason: string;
  created_at: string;
}

export interface HRLeaveBalance {
  id: number;
  leave_type: string;
  year: number;
  total_days: string;
  used_days: string;
  pending_days: string;
  remaining_days: string;
}

export interface HRPayroll {
  id: number;
  employee: number;
  employee_name: string;
  month: number;
  year: number;
  month_name: string;
  basic_salary: string;
  gross_salary: string;
  net_salary: string;
  deductions: string;
  status: 'draft' | 'processed' | 'paid';
  paid_at: string | null;
  present_days: number;
  absent_days: number;
  working_days: number;
}

// ── My Profile ─────────────────────────────────────────────────────────────────

export const hrMeApi = {
  getMyProfile: async (): Promise<HREmployee | null> => {
    const res = await apiClient.get<HREmployee[]>(API_ENDPOINTS.HR_EMPLOYEES);
    if (res.error || !res.data) return null;
    const arr = Array.isArray(res.data) ? res.data : ((res.data as any).results ?? []);
    return arr[0] ?? null;
  },
};

// ── Attendance ─────────────────────────────────────────────────────────────────

export const hrAttendanceApi = {
  getAll: async (params?: { employee?: number; page?: number }): Promise<PaginatedResponse<HRAttendance>> => {
    const q = new URLSearchParams();
    if (params?.employee) q.append('employee', String(params.employee));
    if (params?.page) q.append('page', String(params.page));
    const url = API_ENDPOINTS.HR_ATTENDANCE + (q.toString() ? `?${q}` : '');
    const res = await apiClient.get<PaginatedResponse<HRAttendance>>(url);
    if (res.error || !res.data) throw new Error(res.error || 'Failed');
    return res.data;
  },

  checkIn: async (data: { employee: number; latitude?: number; longitude?: number; address?: string }): Promise<HRAttendance> => {
    const res = await apiClient.post<HRAttendance>(API_ENDPOINTS.HR_ATTENDANCE_CHECK_IN, data);
    if (res.error || !res.data) throw new Error(res.error || 'Check-in failed');
    return res.data;
  },

  checkOut: async (data: { employee: number; latitude?: number; longitude?: number }): Promise<HRAttendance> => {
    const res = await apiClient.post<HRAttendance>(API_ENDPOINTS.HR_ATTENDANCE_CHECK_OUT, data);
    if (res.error || !res.data) throw new Error(res.error || 'Check-out failed');
    return res.data;
  },
};

// ── Requests ───────────────────────────────────────────────────────────────────

export const hrRequestsApi = {
  getAll: async (params?: { employee?: number; status?: string; page?: number }): Promise<PaginatedResponse<HRRequest>> => {
    const q = new URLSearchParams();
    if (params?.employee) q.append('employee', String(params.employee));
    if (params?.status) q.append('status', params.status);
    if (params?.page) q.append('page', String(params.page));
    const url = API_ENDPOINTS.HR_REQUESTS + (q.toString() ? `?${q}` : '');
    const res = await apiClient.get<PaginatedResponse<HRRequest>>(url);
    if (res.error || !res.data) throw new Error(res.error || 'Failed');
    return res.data;
  },

  create: async (data: {
    employee: number;
    request_type: string;
    start_date?: string;
    end_date?: string;
    days?: number;
    reason?: string;
  }): Promise<HRRequest> => {
    const res = await apiClient.post<HRRequest>(API_ENDPOINTS.HR_REQUESTS, data);
    if (res.error || !res.data) throw new Error(res.error || 'Failed to submit request');
    return res.data;
  },

  approve: async (id: number): Promise<HRRequest> => {
    const res = await apiClient.post<HRRequest>(API_ENDPOINTS.HR_REQUEST_APPROVE(String(id)), {});
    if (res.error || !res.data) throw new Error(res.error || 'Failed');
    return res.data;
  },

  reject: async (id: number, reject_reason: string): Promise<HRRequest> => {
    const res = await apiClient.post<HRRequest>(API_ENDPOINTS.HR_REQUEST_REJECT(String(id)), { reject_reason });
    if (res.error || !res.data) throw new Error(res.error || 'Failed');
    return res.data;
  },

  getLeaveBalances: async (employee: number, year: number): Promise<HRLeaveBalance[]> => {
    const q = new URLSearchParams({ employee: String(employee), year: String(year) });
    const res = await apiClient.get<PaginatedResponse<HRLeaveBalance>>(API_ENDPOINTS.HR_LEAVE_BALANCES + `?${q}`);
    if (res.error || !res.data) return [];
    return res.data.results ?? [];
  },
};

// ── Payroll ────────────────────────────────────────────────────────────────────

export const hrPayrollApi = {
  getAll: async (params?: { employee?: number; year?: number; page?: number }): Promise<PaginatedResponse<HRPayroll>> => {
    const q = new URLSearchParams();
    if (params?.employee) q.append('employee', String(params.employee));
    if (params?.year) q.append('year', String(params.year));
    if (params?.page) q.append('page', String(params.page));
    const url = API_ENDPOINTS.HR_PAYROLL + (q.toString() ? `?${q}` : '');
    const res = await apiClient.get<PaginatedResponse<HRPayroll>>(url);
    if (res.error || !res.data) throw new Error(res.error || 'Failed');
    return res.data;
  },
};
