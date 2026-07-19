import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';
import { HREmployee } from '@/lib/api/hr';

export interface UseMyEmployeeProfileResult {
  employeeProfile: HREmployee | null;
  /** Shorthand for `employeeProfile?.id ?? null`. */
  employeeId: number | null;
  loading: boolean;
  /** Re-run the lookup (e.g. after an admin links the user's employee record). */
  reload: () => Promise<void>;
}

/**
 * Resolves the HR employee record linked to the signed-in user.
 *
 * There is no "employees/me" endpoint, so every HR screen — app/(tabs)/hr.tsx,
 * app/hr/attendance-history.tsx, app/hr/payslip.tsx, app/hr/requests.tsx —
 * fetches the full employee list and matches it against the signed-in user
 * itself before it can query attendance, requests, payroll, or leave
 * balances scoped to that employee:
 *
 * ```ts
 * const empRes = await apiClient.get<any>(API_ENDPOINTS.HR_EMPLOYEES);
 * const employees: any[] = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.results ?? []);
 * const me = employees.find(
 *   (e: any) => e.user?.id === Number(user?.id) || String(e.user?.id) === String(user?.id)
 * );
 * ```
 *
 * `useMyEmployeeProfile` does that lookup once instead of every screen
 * repeating it:
 * ```ts
 * const { employeeProfile, employeeId, loading, reload } = useMyEmployeeProfile();
 * ```
 */
export function useMyEmployeeProfile(): UseMyEmployeeProfileResult {
  const { user } = useAuth();
  const [employeeProfile, setEmployeeProfile] = useState<HREmployee | null>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      if (mountedRef.current) {
        setEmployeeProfile(null);
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const empRes = await apiClient.get<any>(API_ENDPOINTS.HR_EMPLOYEES);
      const employees: any[] = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.results ?? []);
      const me = employees.find(
        (e: any) => e.user?.id === Number(user.id) || String(e.user?.id) === String(user.id)
      );
      if (mountedRef.current) setEmployeeProfile(me ?? null);
    } catch {
      // Silent, matching the existing screens — a lookup failure is
      // treated the same as "no employee profile linked".
      if (mountedRef.current) setEmployeeProfile(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return {
    employeeProfile,
    employeeId: employeeProfile ? employeeProfile.id : null,
    loading,
    reload: load,
  };
}
