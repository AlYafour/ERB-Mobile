import { usePermissionsContext } from '@/contexts/PermissionsContext';

/**
 * Thin compatibility wrapper over PermissionsContext.
 *
 * Historically every screen that called usePermissions() fired its own
 * GET /api/user-permission-summary/me/ with no cache — 17 independent fetches
 * per session and visible button flicker while each one loaded. The data now
 * comes from a single session-cached fetch of /api/auth/my-permissions/
 * (same endpoint as the web) inside PermissionsProvider; this hook keeps the
 * existing call signature so screens don't need to change.
 */
export function usePermissions() {
  const ctx = usePermissionsContext();
  return {
    isLoading: ctx.isLoading,
    isAdmin: ctx.isAdmin,
    modules: ctx.modules,
    hasPermission: ctx.hasPermission,
    hasPermissionKey: ctx.hasPermissionKey,
    hasAnyPermission: ctx.hasAnyPermission,
    hasAllPermissions: ctx.hasAllPermissions,
    hasModule: ctx.hasModule,
    refetch: ctx.refetch,
  };
}

export function useHasPermission(category: string, action: string): boolean {
  const { hasPermission } = usePermissionsContext();
  return hasPermission(category, action);
}
