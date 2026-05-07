import { useState, useEffect } from 'react';
import { permissionsApi } from '@/lib/api/permissions';
import { useAuth } from '@/contexts/AuthContext';

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Array<{ category: string; action: string }>>([]);
  const [permissionSet, setPermissionSet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, [user]);

  const loadPermissions = async (attempt = 0) => {
    try {
      setIsLoading(true);
      const data = await permissionsApi.getMyPermissions();
      setPermissions(data.permissions || []);
      setPermissionSet(data.permission_set);
    } catch (error: any) {
      const isNetworkError =
        error.message?.includes('timed out') ||
        error.message?.includes('Network') ||
        error.message?.includes('fetch');
      if (attempt === 0 && isNetworkError) {
        // Retry once after 5s — covers ngrok tunnel reconnects and cold starts
        setTimeout(() => loadPermissions(1), 5000);
        return;
      }
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (category: string, action: string): boolean => {
    if (user?.is_superuser) {
      return true;
    }
    return permissions.some(
      (p) => p.category === category && p.action === action
    );
  };

  const hasAnyPermission = (checks: Array<{ category: string; action: string }>): boolean => {
    return checks.some((check) => hasPermission(check.category, check.action));
  };

  const hasAllPermissions = (checks: Array<{ category: string; action: string }>): boolean => {
    return checks.every((check) => hasPermission(check.category, check.action));
  };

  return {
    permissions,
    permissionSet,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}

export function useHasPermission(category: string, action: string): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(category, action);
}

