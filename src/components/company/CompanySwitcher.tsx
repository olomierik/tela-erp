import { useState, useEffect } from 'react';
import { Building2, Plus, ChevronDown, Check } from 'lucide-react';
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
  const { user, tenant, isDemo, refreshProfile } = useAuth();
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const loadCompanies = async () => {
    if (isDemo || !user?.id) {
      setCompanies([{
        id: 'demo-tenant',
        name: tenant?.name || 'TELA Industries',
        business_type: 'trading',
        default_currency: 'USD',
      }]);
      return;
    }

    // Get all tenants where user has a profile
    const { data: profiles } = await (supabase.from('profiles') as any)
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!profiles?.length) return;

    const tenantIds = profiles.map((p: any) => p.tenant_id);
    const { data: tenants } = await (supabase.from('tenants') as any)
      .select('id, name, business_type, default_currency')
      .in('id', tenantIds)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    setCompanies(tenants ?? []);
  };

  useEffect(() => {
    loadCompanies();
  }, [user?.id, tenant?.id, isDemo]);

  const handleSwitchCompany = async (companyId: string) => {
    if (companyId === tenant?.id) { setOpen(false); return; }

    // To switch company, we update the user's "active" profile
    // The simplest approach: reload the page with the new tenant context
    // We'll store the desired tenant in localStorage and let AuthContext pick it up
    localStorage.setItem('tela_active_tenant', companyId);
    setOpen(false);
    window.location.reload();
  };

  const handleCompanyCreated = (newTenantId: string) => {
    localStorage.setItem('tela_active_tenant', newTenantId);
    window.location.reload();
  };

  // Don't render if only one company
  if (companies.length <= 1 && !createOpen) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          title="Create new company"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">New Company</span>
        </Button>
        <CompanyCreationDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCompanyCreated={handleCompanyCreated}
        />
      </>
    );
  }

  const typeColors: Record<string, string> = {
    trading: 'bg-blue-500',
    manufacturing: 'bg-purple-500',
    service: 'bg-emerald-500',
    retail: 'bg-amber-500',
    construction: 'bg-orange-500',
    logistics: 'bg-cyan-500',
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs max-w-[160px]">
            <div className={cn('w-2 h-2 rounded-full shrink-0', typeColors[tenant?.business_type as string] || 'bg-blue-500')} />
            <span className="truncate">{tenant?.name || 'Company'}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1.5">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Companies</div>
          {companies.map(c => (
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
                <p className="text-[10px] text-muted-foreground capitalize">{c.business_type} · {c.default_currency}</p>
              </div>
              {c.id === tenant?.id && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>
          ))}
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
