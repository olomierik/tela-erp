import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { clearTenantData } from '@/lib/offline/db';
import type { Tenant, UserRole } from '@/types/erp';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  tenant: Tenant | null;
  role: UserRole | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, companyName?: string, role?: UserRole, phone?: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_PROFILE: Profile = {
  id: 'demo-user',
  user_id: 'demo-user',
  tenant_id: 'demo-tenant',
  email: 'demo@tela-erp.com',
  full_name: 'Demo User',
  phone: '',
  is_active: true,
  created_at: new Date().toISOString(),
};

const DEMO_TENANT: Tenant = {
  id: 'demo-tenant',
  name: 'Demo Company',
  slug: 'demo-company',
  primary_color: '#3B82F6',
  subscription_tier: 'premium',
  is_active: true,
  created_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const fetchUserData = async (userId: string) => {
    try {
      const preferredTenantId = localStorage.getItem('tela_active_tenant');

      // Always load the profile by user_id only (profiles has UNIQUE(user_id))
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!profileData) return;

      // Determine which tenant to activate:
      // 1. If a preferred tenant is stored and the user is a member → use it
      // 2. Otherwise fall back to the profile's own tenant
      let activeTenantId = profileData.tenant_id;

      if (preferredTenantId && preferredTenantId !== profileData.tenant_id) {
        // Verify the user actually belongs to the preferred tenant via user_companies
        const { data: membership } = await (supabase as any)
          .from('user_companies')
          .select('tenant_id')
          .eq('user_id', userId)
          .eq('tenant_id', preferredTenantId)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (membership) {
          activeTenantId = preferredTenantId;
        } else {
          // Not a valid member — clear stale preference
          localStorage.removeItem('tela_active_tenant');
        }
      }

      // Keep the profile tenant in sync with the actively selected company so
      // tenant-scoped backend policies resolve against the correct tenant.
      if (activeTenantId !== profileData.tenant_id) {
        const { data: syncedProfile, error: syncError } = await (supabase as any)
          .from('profiles')
          .update({ tenant_id: activeTenantId })
          .eq('user_id', userId)
          .select('*')
          .single();

        if (syncError) {
          console.error('Error syncing active tenant to profile:', syncError);
        } else if (syncedProfile) {
          profileData = syncedProfile;
        }
      }

      setProfile(profileData);

      // Load the active tenant
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', activeTenantId)
        .single();

      if (tenantData) setTenant(tenantData as Tenant);

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      if (roleData) setRole(roleData.role as UserRole);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const enableDemoMode = () => {
    setIsDemo(true);
    setProfile(DEMO_PROFILE);
    setTenant(DEMO_TENANT);
    setRole('admin');
    setUser({ id: 'demo', email: 'admin@tela-erp.com' } as any);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          setIsDemo(false);
          setTimeout(() => fetchUserData(currentSession.user.id), 0);
        } else if (!isDemo) {
          // No real user — enable demo mode for preview
          enableDemoMode();
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        fetchUserData(existingSession.user.id);
      } else {
        enableDemoMode();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setIsDemo(false);
  };

  const signUp = async (email: string, password: string, fullName: string, companyName?: string, signUpRole?: UserRole, phone?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName || fullName + "'s Company",
          role: signUpRole || 'admin',
          phone: phone || '',
        },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const signOut = async () => {
    const tenantId = tenant?.id;
    await supabase.auth.signOut();
    if (tenantId) {
      try { await clearTenantData(tenantId); } catch { /* best-effort */ }
    }
    setSession(null);
    enableDemoMode();
  };

  const refreshProfile = async () => {
    if (user && !isDemo) await fetchUserData(user.id);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, tenant, role, loading, isDemo,
      signIn, signUp, signInWithMagicLink, resetPassword, updatePassword, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
