import { useState, useEffect } from 'react';
import { Plus, ChevronDown, Check, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import CompanyCreationDialog from './CompanyCreationDialog';

interface CompanyInfo {
  id: string;
  name: string;
  business_type: string;
  default_currency: string;
}

export default function CompanySwitcher() {
  const { user, tenant, isDemo } = useAuth();
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const loadCompanies = async () => {
    setLoadingCompanies(true);

    if (isDemo || !user?.id) {
      setCompanies([{
        id: 'demo-tenant',
        name: tenant?.name || 'Demo Company',
        business_type: 'trading',
        default_currency: 'USD',
      }]);
      setLoadingCompanies(false);
      return;
    }

    // Get all companies the user belongs to via user_companies (multi-company aware)
    const { data: memberships } = await (supabase.from('user_companies') as any)
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Fallback: if user_companies table isn't populated yet, try profiles
    const tenantIds: string[] = memberships?.length
      ? memberships.map((m: any) => m.tenant_id)
      : [];

    if (!tenantIds.length) {
      // Last resort: fall back to profiles table (original single-company flow)
      const { data: profiles } = await (supabase.from('profiles') as any)
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (profiles?.length) {
        tenantIds.push(...profiles.map((p: any) => p.tenant_id));
      }
    }

    if (!tenantIds.length) {
      // Nothing found — show current tenant as fallback
      if (tenant) {
        setCompanies([{
          id: tenant.id,
          name: tenant.name,
          business_type: (tenant as any).business_type || 'trading',
          default_currency: (tenant as any).default_currency || 'USD',
        }]);
      }
      setLoadingCompanies(false);
      return;
    }

    const { data: tenants } = await (supabase.from('tenants') as any)
      .select('id, name, business_type, default_currency')
      .in('id', tenantIds)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    setCompanies(tenants ?? []);
    setLoadingCompanies(false);
  };

  useEffect(() => {
    loadCompanies();
  }, [user?.id, tenant?.id, isDemo]);

  const handleSwitchCompany = (companyId: string) => {
    if (companyId === tenant?.id) { setOpen(false); return; }
    localStorage.setItem('tela_active_tenant', companyId);
    setOpen(false);
    window.location.reload();
  };

  const handleCompanyCreated = (newTenantId: string) => {
    localStorage.setItem('tela_active_tenant', newTenantId);
    window.location.reload();
  };

  const typeColors: Record<string, string> = {
    trading: 'bg-blue-500',
    manufacturing: 'bg-purple-500',
    service: 'bg-emerald-500',
    retail: 'bg-amber-500',
    construction: 'bg-orange-500',
    logistics: 'bg-cyan-500',
  };

  const currentBizType = (tenant as any)?.business_type as string;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs max-w-[200px]">
            {loadingCompanies ? (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
            ) : (
              <div className={cn('w-2 h-2 rounded-full shrink-0', typeColors[currentBizType] || 'bg-blue-500')} />
            )}
            <span className="truncate">{tenant?.name || 'Company'}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-1.5">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your Companies
          </div>

          {loadingCompanies ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-xs gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading…
            </div>
          ) : companies.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              No companies found
            </div>
          ) : (
            companies.map(c => (
              <button
                key={c.id}
                onClick={() => handleSwitchCompany(c.id)}
                className={cn(
                  'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm text-left transition-colors',
                  c.id === tenant?.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                )}
              >
                <div className={cn('w-2 h-2 rounded-full shrink-0', typeColors[c.business_type] || 'bg-blue-500')} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {c.business_type} · {c.default_currency}
                  </p>
                </div>
                {c.id === tenant?.id && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))
          )}

          <div className="border-t border-border mt-1.5 pt-1.5">
            <button
              onClick={() => { setOpen(false); setCreateOpen(true); }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-sm hover:bg-accent transition-colors text-muted-foreground"
            >
              <Plus className="w-4 h-4" />
              Create New Company
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <CompanyCreationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCompanyCreated={handleCompanyCreated}
      />
    </>
  );
}
