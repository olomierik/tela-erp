import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Tenant, UserRole } from '@/types/erp';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  tenant: Tenant | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo data for now (before DB is set up)
const DEMO_PROFILE: Profile = {
  id: 'demo-user',
  tenant_id: 'demo-tenant',
  email: 'admin@tela-erp.com',
  full_name: 'Alex Morgan',
  role: 'admin',
  is_active: true,
  created_at: new Date().toISOString(),
};

const DEMO_TENANT: Tenant = {
  id: 'demo-tenant',
  name: 'TELA Industries',
  slug: 'tela-industries',
  primary_color: '#3B82F6',
  subscription_tier: 'pro',
  is_active: true,
  created_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(DEMO_PROFILE);
  const [tenant, setTenant] = useState<Tenant | null>(DEMO_TENANT);
  const [loading, setLoading] = useState(false);

  // For demo, we auto-login
  useEffect(() => {
    setUser({ id: 'demo', email: 'admin@tela-erp.com' });
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setTenant(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, tenant, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
