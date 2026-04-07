import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type ModuleKey =
  | 'production' | 'inventory' | 'sales' | 'marketing' | 'accounting'
  | 'procurement' | 'hr' | 'crm' | 'projects' | 'assets' | 'expenses'
  | 'budgets' | 'fleet' | 'maintenance' | 'pos' | 'subscriptions' | 'ai';

export const MODULE_LABELS: Record<ModuleKey, string> = {
  production: 'Production',
  inventory: 'Inventory',
  sales: 'Sales',
  marketing: 'Marketing',
  accounting: 'Accounting',
  procurement: 'Procurement',
  hr: 'HR & Payroll',
  crm: 'CRM',
  projects: 'Projects',
  assets: 'Fixed Assets',
  expenses: 'Expenses',
  budgets: 'Budgets',
  fleet: 'Fleet',
  maintenance: 'Maintenance',
  pos: 'Point of Sale',
  subscriptions: 'Subscriptions',
  ai: 'AI Intelligence',
};

export const ALL_MODULES: ModuleKey[] = Object.keys(MODULE_LABELS) as ModuleKey[];

export const INDUSTRY_PRESETS: Record<string, { label: string; description: string; icon: string; modules: ModuleKey[] }> = {
  retail: {
    label: 'Retail & Commerce',
    description: 'Physical or online stores selling products directly to consumers',
    icon: '🛍️',
    modules: ['accounting', 'sales', 'inventory', 'procurement', 'pos', 'hr', 'expenses', 'crm', 'marketing'],
  },
  manufacturing: {
    label: 'Manufacturing',
    description: 'Companies that produce goods from raw materials or components',
    icon: '🏭',
    modules: ['accounting', 'production', 'inventory', 'procurement', 'hr', 'expenses', 'assets', 'maintenance', 'budgets'],
  },
  services: {
    label: 'Professional Services',
    description: 'Consulting, legal, accounting, agencies, and other service businesses',
    icon: '💼',
    modules: ['accounting', 'sales', 'projects', 'hr', 'crm', 'expenses', 'marketing', 'budgets'],
  },
  hospitality: {
    label: 'Hospitality & Restaurant',
    description: 'Hotels, restaurants, cafes, bars, and food service businesses',
    icon: '🍽️',
    modules: ['accounting', 'pos', 'inventory', 'hr', 'expenses', 'procurement'],
  },
  healthcare: {
    label: 'Healthcare & Medical',
    description: 'Clinics, hospitals, pharmacies, and health service providers',
    icon: '🏥',
    modules: ['accounting', 'hr', 'inventory', 'expenses', 'assets', 'crm'],
  },
  construction: {
    label: 'Construction & Engineering',
    description: 'Contractors, builders, civil engineering, and infrastructure firms',
    icon: '🏗️',
    modules: ['accounting', 'projects', 'assets', 'hr', 'procurement', 'inventory', 'expenses', 'maintenance'],
  },
  logistics: {
    label: 'Logistics & Transportation',
    description: 'Freight, delivery, warehousing, and supply chain companies',
    icon: '🚚',
    modules: ['accounting', 'fleet', 'hr', 'inventory', 'procurement', 'expenses'],
  },
  ecommerce: {
    label: 'E-Commerce & Online Business',
    description: 'Online stores, marketplaces, dropshipping, and digital products',
    icon: '🌐',
    modules: ['accounting', 'sales', 'inventory', 'marketing', 'subscriptions', 'crm', 'expenses'],
  },
  nonprofit: {
    label: 'Non-Profit & NGO',
    description: 'Charities, foundations, religious organisations, and social enterprises',
    icon: '❤️',
    modules: ['accounting', 'hr', 'projects', 'expenses', 'marketing', 'budgets'],
  },
  agriculture: {
    label: 'Agriculture & Farming',
    description: 'Farms, agribusinesses, food processing, and agri-supply companies',
    icon: '🌱',
    modules: ['accounting', 'inventory', 'procurement', 'production', 'hr', 'expenses', 'assets'],
  },
  realestate: {
    label: 'Real Estate & Property',
    description: 'Property developers, agents, landlords, and property managers',
    icon: '🏢',
    modules: ['accounting', 'assets', 'sales', 'hr', 'expenses', 'maintenance', 'crm'],
  },
  technology: {
    label: 'Technology & SaaS',
    description: 'Software companies, tech startups, IT services, and digital agencies',
    icon: '💻',
    modules: ['accounting', 'subscriptions', 'projects', 'hr', 'expenses', 'marketing', 'sales', 'crm', 'ai'],
  },
  general: {
    label: 'General Business',
    description: 'All modules activated — suitable for businesses with diverse needs',
    icon: '🏬',
    modules: ALL_MODULES,
  },
};

interface ModulesContextType {
  activeModules: ModuleKey[];
  industry: string;
  onboardingCompleted: boolean;
  loading: boolean;
  isModuleActive: (key: ModuleKey) => boolean;
  toggleModule: (key: ModuleKey) => void;
  setIndustry: (key: string) => void;
  completeOnboarding: (industry: string, modules: ModuleKey[]) => void;
}

const ModulesContext = createContext<ModulesContextType | undefined>(undefined);

const storageKey = (tenantId: string) => `tela_modules_${tenantId}`;

export function ModulesProvider({ children }: { children: ReactNode }) {
  const { tenant, loading: authLoading, isDemo } = useAuth();
  const [activeModules, setActiveModules] = useState<ModuleKey[]>(ALL_MODULES);
  const [industry, setIndustryState] = useState<string>('general');
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const key = storageKey(tenant?.id ?? 'demo');
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setActiveModules(parsed.activeModules ?? ALL_MODULES);
        setIndustryState(parsed.industry ?? 'general');
        setOnboardingCompleted(parsed.onboardingCompleted ?? false);
      } catch {
        setOnboardingCompleted(isDemo ? true : false);
      }
    } else {
      // Demo mode skips onboarding
      setOnboardingCompleted(isDemo ? true : false);
    }
    setLoading(false);
  }, [authLoading, tenant?.id, isDemo]);

  const save = (modules: ModuleKey[], ind: string, completed: boolean) => {
    const key = storageKey(tenant?.id ?? 'demo');
    localStorage.setItem(key, JSON.stringify({ activeModules: modules, industry: ind, onboardingCompleted: completed }));
  };

  const isModuleActive = (key: ModuleKey) => activeModules.includes(key);

  const toggleModule = (key: ModuleKey) => {
    const next = activeModules.includes(key)
      ? activeModules.filter(m => m !== key)
      : [...activeModules, key];
    setActiveModules(next);
    save(next, industry, onboardingCompleted);
  };

  const setIndustry = (key: string) => {
    const preset = INDUSTRY_PRESETS[key];
    const modules = preset?.modules ?? ALL_MODULES;
    setIndustryState(key);
    setActiveModules(modules);
    save(modules, key, onboardingCompleted);
  };

  const completeOnboarding = (ind: string, modules: ModuleKey[]) => {
    setIndustryState(ind);
    setActiveModules(modules);
    setOnboardingCompleted(true);
    save(modules, ind, true);
  };

  return (
    <ModulesContext.Provider value={{
      activeModules, industry, onboardingCompleted, loading,
      isModuleActive, toggleModule, setIndustry, completeOnboarding,
    }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  const ctx = useContext(ModulesContext);
  if (!ctx) throw new Error('useModules must be used within ModulesProvider');
  return ctx;
}
