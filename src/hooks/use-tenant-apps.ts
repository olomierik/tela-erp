import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { APP_CATALOG, type AppDefinition } from '@/lib/app-registry';
import { toast } from 'sonner';

interface TenantApp {
  id: string;
  tenant_id: string;
  app_key: string;
  installed_at: string;
  installed_by: string | null;
  is_active: boolean;
}

export function useTenantApps() {
  const { tenant, user, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin' || role === 'reseller';

  const { data: installedApps = [], isLoading } = useQuery({
    queryKey: ['tenant-apps', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id || isDemo) return [];
      const { data, error } = await (supabase as any)
        .from('tenant_apps')
        .select('*')
        .eq('tenant_id', tenant.id);
      if (error) throw error;
      return (data ?? []) as TenantApp[];
    },
    enabled: !!tenant?.id,
  });

  const installedKeys = new Set(
    installedApps.filter(a => a.is_active).map(a => a.app_key)
  );

  // Core apps are always considered installed
  const activeAppKeys = new Set([
    ...APP_CATALOG.filter(a => a.isCore).map(a => a.key),
    ...installedKeys,
  ]);

  const isInstalled = (key: string) => activeAppKeys.has(key);

  const getActiveApps = (): AppDefinition[] =>
    APP_CATALOG.filter(a => activeAppKeys.has(a.key));

  const getActiveRoutes = (): string[] =>
    getActiveApps().flatMap(a => a.routes);

  const installApp = useMutation({
    mutationFn: async (appKey: string) => {
      if (!tenant?.id || !user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('tenant_apps')
        .upsert(
          { tenant_id: tenant.id, app_key: appKey, installed_by: user.id, is_active: true },
          { onConflict: 'tenant_id,app_key' }
        );
      if (error) throw error;
    },
    onSuccess: (_, appKey) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-apps'] });
      const app = APP_CATALOG.find(a => a.key === appKey);
      toast.success(`${app?.name ?? appKey} installed successfully`);
    },
    onError: (err: Error) => {
      toast.error('Failed to install app: ' + err.message);
    },
  });

  const uninstallApp = useMutation({
    mutationFn: async (appKey: string) => {
      if (!tenant?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('tenant_apps')
        .update({ is_active: false })
        .eq('tenant_id', tenant.id)
        .eq('app_key', appKey);
      if (error) throw error;
    },
    onSuccess: (_, appKey) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-apps'] });
      const app = APP_CATALOG.find(a => a.key === appKey);
      toast.success(`${app?.name ?? appKey} uninstalled`);
    },
    onError: (err: Error) => {
      toast.error('Failed to uninstall app: ' + err.message);
    },
  });

  return {
    installedApps,
    isLoading,
    isAdmin,
    isInstalled,
    getActiveApps,
    getActiveRoutes,
    activeAppKeys,
    installApp,
    uninstallApp,
  };
}
