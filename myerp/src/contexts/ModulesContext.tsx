import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ─── Module definitions ───────────────────────────────────────────────────────

export type ModuleKey =
  | 'finance'
  | 'sales'
  | 'procurement'
  | 'inventory'
  | 'hr'
  | 'manufacturing'
  | 'projects'
  | 'assets'
  | 'expenses'
  | 'helpdesk'
  | 'fleet'
  | 'maintenance'
  | 'marketing'
  | 'subscriptions'
  | 'pos';

export const ALL_MODULES: ModuleKey[] = [
  'finance', 'sales', 'procurement', 'inventory', 'hr',
  'manufacturing', 'projects', 'assets', 'expenses', 'helpdesk',
  'fleet', 'maintenance', 'marketing', 'subscriptions', 'pos',
];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  finance: 'Finance & Accounting',
  sales: 'Sales & CRM',
  procurement: 'Procurement',
  inventory: 'Inventory',
  hr: 'HR & Payroll',
  manufacturing: 'Manufacturing',
  projects: 'Projects',
  assets: 'Assets',
  expenses: 'Expenses',
  helpdesk: 'Helpdesk',
  fleet: 'Fleet Management',
  maintenance: 'Maintenance',
  marketing: 'Email Marketing',
  subscriptions: 'Subscriptions',
  pos: 'Point of Sale',
};

// ─── Industry presets (mirrors DB seed data) ─────────────────────────────────

export const INDUSTRY_PRESETS: Record<string, { label: string; description: string; icon: string; modules: ModuleKey[] }> = {
  retail: {
    label: 'Retail & Commerce',
    description: 'Physical or online stores selling products to consumers',
    icon: '🛍️',
    modules: ['finance', 'sales', 'inventory', 'procurement', 'pos', 'hr', 'expenses'],
  },
  manufacturing: {
    label: 'Manufacturing',
    description: 'Companies that produce goods from raw materials',
    icon: '🏭',
    modules: ['finance', 'manufacturing', 'inventory', 'procurement', 'hr', 'expenses', 'assets', 'maintenance'],
  },
  services: {
    label: 'Professional Services',
    description: 'Consulting, agencies, legal, and service businesses',
    icon: '💼',
    modules: ['finance', 'sales', 'projects', 'hr', 'helpdesk', 'expenses', 'marketing'],
  },
  hospitality: {
    label: 'Hospitality & Restaurant',
    description: 'Hotels, restaurants, cafes, and food service',
    icon: '🍽️',
    modules: ['finance', 'pos', 'inventory', 'hr', 'expenses', 'procurement'],
  },
  healthcare: {
    label: 'Healthcare & Medical',
    description: 'Clinics, hospitals, pharmacies, and health services',
    icon: '🏥',
    modules: ['finance', 'hr', 'inventory', 'helpdesk', 'expenses', 'assets'],
  },
  construction: {
    label: 'Construction & Engineering',
    description: 'Contractors, builders, and civil engineering firms',
    icon: '🏗️',
    modules: ['finance', 'projects', 'assets', 'hr', 'procurement', 'inventory', 'expenses', 'maintenance'],
  },
  logistics: {
    label: 'Logistics & Transportation',
    description: 'Freight, delivery, and supply chain companies',
    icon: '🚚',
    modules: ['finance', 'fleet', 'hr', 'inventory', 'procurement', 'expenses'],
  },
  ecommerce: {
    label: 'E-Commerce & Online',
    description: 'Online stores, marketplaces, and digital products',
    icon: '🌐',
    modules: ['finance', 'sales', 'inventory', 'marketing', 'subscriptions', 'helpdesk', 'expenses'],
  },
  nonprofit: {
    label: 'Non-Profit & NGO',
    description: 'Charities, foundations, and social enterprises',
    icon: '❤️',
    modules: ['finance', 'hr', 'projects', 'expenses', 'marketing'],
  },
  agriculture: {
    label: 'Agriculture & Farming',
    description: 'Farms, agribusinesses, and food processing',
    icon: '🌱',
    modules: ['finance', 'inventory', 'procurement', 'manufacturing', 'hr', 'expenses', 'assets'],
  },
  realestate: {
    label: 'Real Estate & Property',
    description: 'Property developers, agents, and landlords',
    icon: '🏢',
    modules: ['finance', 'assets', 'sales', 'hr', 'expenses', 'maintenance'],
  },
  technology: {
    label: 'Technology & SaaS',
    description: 'Software companies, IT services, and digital agencies',
    icon: '💻',
    modules: ['finance', 'subscriptions', 'projects', 'helpdesk', 'hr', 'expenses', 'marketing', 'sales'],
  },
  general: {
    label: 'General Business',
    description: 'All modules — for diverse business needs',
    icon: '🏬',
    modules: [...ALL_MODULES],
  },
};

// ─── Context types ────────────────────────────────────────────────────────────

interface ModulesContextValue {
  activeModules: ModuleKey[];
  industry: string;
  onboardingCompleted: boolean;
  loading: boolean;
  isModuleActive: (key: ModuleKey) => boolean;
  toggleModule: (key: ModuleKey) => Promise<void>;
  setIndustry: (industry: string) => Promise<void>;
  completeOnboarding: (industry: string, modules: ModuleKey[]) => Promise<void>;
}

const ModulesContext = createContext<ModulesContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ModulesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeModules, setActiveModules] = useState<ModuleKey[]>([...ALL_MODULES]);
  const [industry, setIndustryState] = useState('general');
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('myerp_profiles')
      .select('active_modules, industry, onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setActiveModules((data.active_modules as ModuleKey[]) ?? [...ALL_MODULES]);
          setIndustryState(data.industry ?? 'general');
          setOnboardingCompleted(data.onboarding_completed ?? false);
        } else {
          // Profile row missing — treat as needing onboarding
          setOnboardingCompleted(false);
        }
        setLoading(false);
      });
  }, [user]);

  const saveToDb = useCallback(async (updates: Record<string, unknown>) => {
    if (!user) return;
    await supabase
      .from('myerp_profiles')
      .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' });
  }, [user]);

  const isModuleActive = useCallback((key: ModuleKey) => activeModules.includes(key), [activeModules]);

  const toggleModule = useCallback(async (key: ModuleKey) => {
    setActiveModules(prev => {
      const next = prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key];
      saveToDb({ active_modules: next });
      return next;
    });
  }, [saveToDb]);

  const setIndustry = useCallback(async (ind: string) => {
    const preset = INDUSTRY_PRESETS[ind];
    const modules = preset ? preset.modules : [...ALL_MODULES];
    setIndustryState(ind);
    setActiveModules(modules);
    await saveToDb({ industry: ind, active_modules: modules });
  }, [saveToDb]);

  const completeOnboarding = useCallback(async (ind: string, modules: ModuleKey[]) => {
    setIndustryState(ind);
    setActiveModules(modules);
    setOnboardingCompleted(true);
    await saveToDb({ industry: ind, active_modules: modules, onboarding_completed: true });
  }, [saveToDb]);

  return (
    <ModulesContext.Provider value={{
      activeModules, industry, onboardingCompleted, loading,
      isModuleActive, toggleModule, setIndustry, completeOnboarding,
    }}>
      {children}
    </ModulesContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useModules() {
  const ctx = useContext(ModulesContext);
  if (!ctx) throw new Error('useModules must be used inside ModulesProvider');
  return ctx;
}
