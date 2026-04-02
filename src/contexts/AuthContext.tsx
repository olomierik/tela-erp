import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
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
  email: 'admin@tela-erp.com',
  full_name: 'Alex Morgan',
  phone: '+254 700 000 000',
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const fetchUserData = async (userId: string) => {
    try {
      // Check if user has a preferred tenant
      const preferredTenant = localStorage.getItem('tela_active_tenant');

      let profileQuery = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId);

      if (preferredTenant) {
        profileQuery = profileQuery.eq('tenant_id', preferredTenant);
      }

      const { data: profileData } = await profileQuery.limit(1).single();

      if (profileData) {
        setProfile(profileData);
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profileData.tenant_id)
          .single();
        if (tenantData) setTenant(tenantData as Tenant);
      } else if (preferredTenant) {
        // Preferred tenant not found for user, clear and retry with default
        localStorage.removeItem('tela_active_tenant');
        const { data: fallback } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .limit(1)
          .single();
        if (fallback) {
          setProfile(fallback);
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', fallback.tenant_id)
            .single();
          if (tenantData) setTenant(tenantData as Tenant);
        }
      }

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
    await supabase.auth.signOut();
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
