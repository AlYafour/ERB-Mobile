import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Single source of truth for permissions — replaces the old per-screen
 * usePermissions fetch (17 screens × one request each, no cache).
 *
 * Uses the SAME endpoint and semantics as the web frontend
 * (GET /api/auth/my-permissions/, lib/hooks/use-my-permissions.ts on web):
 *   - keys are `module.category.action` dot notation
 *   - `all_permissions: true` short-circuits everything for tenant/platform admins
 *   - `modules[]` drives module/section visibility
 *
 * Fetched once per session per user (staleTime: Infinity) and cleared on
 * logout / user change.
 */

export interface MyPermissionsResponse {
  user_id: number;
  primary_role: string;
  roles: string[];
  is_platform_admin: boolean;
  is_tenant_admin: boolean;
  all_permissions: boolean;
  permissions: Record<string, boolean>;
  modules: string[];
}

interface PermissionsContextType {
  isLoading: boolean;
  /** Server said all_permissions, or the user object itself marks an admin. */
  isAdmin: boolean;
  isTenantAdmin: boolean;
  isPlatformAdmin: boolean;
  modules: string[];
  /** Two-arg check, same call signature the screens already use. */
  hasPermission: (category: string, action: string) => boolean;
  /** Full dot-key check (`module.category.action`) for web-parity call sites. */
  hasPermissionKey: (key: string) => boolean;
  hasAnyPermission: (checks: Array<{ category: string; action: string }>) => boolean;
  hasAllPermissions: (checks: Array<{ category: string; action: string }>) => boolean;
  hasModule: (module: string) => boolean;
  refetch: () => void;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

async function fetchMyPermissions(): Promise<MyPermissionsResponse> {
  const res = await apiClient.get<MyPermissionsResponse>(API_ENDPOINTS.MY_PERMISSIONS);
  if (res.error || !res.data) {
    throw new Error(res.error || 'Failed to fetch permissions');
  }
  return res.data;
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ['my-permissions', userId],
    queryFn: fetchMyPermissions,
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
    retryDelay: (attempt) => Math.min(5000, 1000 * 2 ** attempt),
  });

  // Logout / account switch — drop every cached permission payload so the next
  // session can never see the previous user's permissions.
  useEffect(() => {
    if (!userId) {
      queryClient.removeQueries({ queryKey: ['my-permissions'] });
    }
  }, [userId, queryClient]);

  const value = useMemo<PermissionsContextType>(() => {
    const data = query.data;

    // Client-side admin fallback mirrors backend is_company_admin
    // (accounts/models.py): superuser OR role='admin' OR permission_set.level >= 100.
    // This keeps admins fully functional even while the fetch is in flight.
    const userIsAdmin = !!(
      user?.is_superuser ||
      user?.role === 'admin' ||
      ((user as any)?.permission_set?.level ?? 0) >= 100
    );
    const isAdmin = userIsAdmin || !!data?.all_permissions;

    // `category.action` suffix set for the existing two-arg call sites.
    const suffixes = new Set<string>();
    if (data?.permissions) {
      for (const key of Object.keys(data.permissions)) {
        const parts = key.split('.');
        if (parts.length >= 2) {
          suffixes.add(parts.slice(-2).join('.'));
        }
      }
    }

    const hasPermission = (category: string, action: string) =>
      isAdmin || suffixes.has(`${category}.${action}`);

    return {
      isLoading: !!userId && query.isPending,
      isAdmin,
      isTenantAdmin: !!data?.is_tenant_admin || userIsAdmin,
      isPlatformAdmin: !!data?.is_platform_admin || !!user?.is_superuser,
      modules: data?.modules ?? [],
      hasPermission,
      hasPermissionKey: (key: string) => isAdmin || !!data?.permissions?.[key],
      hasAnyPermission: (checks) => checks.some(c => hasPermission(c.category, c.action)),
      hasAllPermissions: (checks) => checks.every(c => hasPermission(c.category, c.action)),
      hasModule: (module: string) =>
        isAdmin || (data?.modules?.length ? data.modules.includes(module) : false),
      refetch: () => { query.refetch(); },
    };
  }, [query.data, query.isPending, userId, user, query.refetch]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext(): PermissionsContextType {
  const ctx = useContext(PermissionsContext);
  if (ctx === undefined) {
    throw new Error('usePermissionsContext must be used within a PermissionsProvider');
  }
  return ctx;
}
