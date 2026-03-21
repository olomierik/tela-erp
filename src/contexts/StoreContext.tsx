import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Store {
  id: string;
  tenant_id: string;
  name: string;
  location: string;
  address: string;
  is_active: boolean;
  created_at: string;
}

interface StoreContextType {
  stores: Store[];
  selectedStoreId: string | null; // null = "All Stores"
  setSelectedStoreId: (id: string | null) => void;
  selectedStore: Store | null;
  isStoreAdmin: boolean;
  loading: boolean;
  refetchStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { tenant, user, isDemo, role } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [isStoreAdmin, setIsStoreAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStores = async () => {
    if (isDemo || !tenant?.id) {
      setStores([{ id: 'demo-store', tenant_id: 'demo-tenant', name: 'Main Store', location: 'HQ', address: '', is_active: true, created_at: new Date().toISOString() }]);
      setIsStoreAdmin(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase.from('stores') as any)
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setStores(data ?? []);

      // Check admin status
      const adminByRole = role === 'admin' || role === 'reseller';
      if (!adminByRole && user) {
        const { data: assignments } = await (supabase.from('user_store_assignments') as any)
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'store_admin');
        setIsStoreAdmin(!!(assignments && assignments.length > 0));
      } else {
        setIsStoreAdmin(adminByRole);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [tenant?.id, isDemo]);

  const selectedStore = selectedStoreId ? stores.find(s => s.id === selectedStoreId) || null : null;

  return (
    <StoreContext.Provider value={{
      stores,
      selectedStoreId,
      setSelectedStoreId,
      selectedStore,
      isStoreAdmin,
      loading,
      refetchStores: fetchStores,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
