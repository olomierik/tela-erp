import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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

// ─── Subscription tier constraints ───────────────────────────────────────────

export type SubscriptionTier = 'starter' | 'premium' | 'enterprise';

/** Modules available per subscription tier */
export const TIER_MODULES: Record<SubscriptionTier, ModuleKey[]> = {
  starter: ['sales', 'inventory'],       // + reports/dashboard always
  premium: ALL_MODULES,
  enterprise: ALL_MODULES,
};

/** Max users per tier (enforced UI-side; backend enforces via RLS/logic) */
export const TIER_MAX_USERS: Record<SubscriptionTier, number> = {
  starter: 1,
  premium: 5,
  enterprise: Infinity,
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

export const TIER_PRICES: Record<SubscriptionTier, string> = {
  starter: 'Free',
  premium: '$6/mo',
  enterprise: '$13/mo',
};

// ─── Industry presets ─────────────────────────────────────────────────────────

export const INDUSTRY_PRESETS: Record<string, {
  label: string;
  description: string;
  icon: string;
  modules: ModuleKey[];
  highlights: string[];  // key selling points for this industry
}> = {
  retail: {
    label: 'Retail & Commerce',
    description: 'Physical or online stores selling products directly to consumers',
    icon: '🛍️',
    modules: ['accounting', 'sales', 'inventory', 'procurement', 'pos', 'hr', 'expenses', 'crm', 'marketing'],
    highlights: ['Point of Sale (POS)', 'Inventory tracking', 'Customer loyalty'],
  },
  manufacturing: {
    label: 'Manufacturing',
    description: 'Companies that produce goods from raw materials or components',
    icon: '🏭',
    modules: ['accounting', 'production', 'inventory', 'procurement', 'hr', 'expenses', 'assets', 'maintenance', 'budgets'],
    highlights: ['Production orders', 'BOM & materials', 'Equipment maintenance'],
  },
  services: {
    label: 'Professional Services',
    description: 'Consulting, legal, accounting, agencies, and other service businesses',
    icon: '💼',
    modules: ['accounting', 'sales', 'projects', 'hr', 'crm', 'expenses', 'marketing', 'budgets'],
    highlights: ['Project tracking', 'Client CRM', 'Time & expense logging'],
  },
  hospitality: {
    label: 'Hospitality & Restaurant',
    description: 'Hotels, restaurants, cafes, bars, and food service businesses',
    icon: '🍽️',
    modules: ['accounting', 'pos', 'inventory', 'hr', 'expenses', 'procurement'],
    highlights: ['Table-side POS', 'Ingredient inventory', 'Staff scheduling'],
  },
  healthcare: {
    label: 'Healthcare & Medical',
    description: 'Clinics, hospitals, pharmacies, and health service providers',
    icon: '🏥',
    modules: ['accounting', 'hr', 'inventory', 'expenses', 'assets', 'crm'],
    highlights: ['Patient records (CRM)', 'Medical supplies', 'Asset tracking'],
  },
  construction: {
    label: 'Construction & Engineering',
    description: 'Contractors, builders, civil engineering, and infrastructure firms',
    icon: '🏗️',
    modules: ['accounting', 'projects', 'assets', 'hr', 'procurement', 'inventory', 'expenses', 'maintenance'],
    highlights: ['Project cost tracking', 'Equipment maintenance', 'Site procurement'],
  },
  logistics: {
    label: 'Logistics & Transportation',
    description: 'Freight, delivery, warehousing, and supply chain companies',
    icon: '🚚',
    modules: ['accounting', 'fleet', 'hr', 'inventory', 'procurement', 'expenses'],
    highlights: ['Fleet management', 'Fuel & service logs', 'Route cost analysis'],
  },
  ecommerce: {
    label: 'E-Commerce & Online Business',
    description: 'Online stores, marketplaces, dropshipping, and digital products',
    icon: '🌐',
    modules: ['accounting', 'sales', 'inventory', 'marketing', 'subscriptions', 'crm', 'expenses'],
    highlights: ['Subscription billing', 'Email campaigns', 'Order management'],
  },
  nonprofit: {
    label: 'Non-Profit & NGO',
    description: 'Charities, foundations, religious organisations, and social enterprises',
    icon: '❤️',
    modules: ['accounting', 'hr', 'projects', 'expenses', 'marketing', 'budgets'],
    highlights: ['Donor tracking', 'Budget control', 'Grant project management'],
  },
  agriculture: {
    label: 'Agriculture & Farming',
    description: 'Farms, agribusinesses, food processing, and agri-supply companies',
    icon: '🌱',
    modules: ['accounting', 'inventory', 'procurement', 'production', 'hr', 'expenses', 'assets'],
    highlights: ['Harvest tracking', 'Equipment & assets', 'Seasonal budgeting'],
  },
  realestate: {
    label: 'Real Estate & Property',
    description: 'Property developers, agents, landlords, and property managers',
    icon: '🏢',
    modules: ['accounting', 'assets', 'sales', 'hr', 'expenses', 'maintenance', 'crm'],
    highlights: ['Property assets', 'Maintenance requests', 'Client pipeline'],
  },
  technology: {
    label: 'Technology & SaaS',
    description: 'Software companies, tech startups, IT services, and digital agencies',
    icon: '💻',
    modules: ['accounting', 'subscriptions', 'projects', 'hr', 'expenses', 'marketing', 'sales', 'crm', 'ai'],
    highlights: ['Subscription MRR', 'AI assistant', 'Sprint project tracking'],
  },
  general: {
    label: 'General Business',
    description: 'All modules activated — suitable for businesses with diverse needs',
    icon: '🏬',
    modules: ALL_MODULES,
    highlights: ['All 17 modules', 'Full customisation', 'Every feature included'],
  },
};

// ─── Context types ────────────────────────────────────────────────────────────

interface ModulesContextType {
  activeModules: ModuleKey[];
  industry: string;
  onboardingCompleted: boolean;
  loading: boolean;
  tier: SubscriptionTier;
  tierAllows: (key: ModuleKey) => boolean;    // is this module allowed by subscription?
  isModuleActive: (key: ModuleKey) => boolean; // allowed by tier AND user-selected
  maxUsers: number;
  toggleModule: (key: ModuleKey) => void;
  setIndustry: (key: string) => void;
  completeOnboarding: (industry: string, modules: ModuleKey[]) => void;
}

const ModulesContext = createContext<ModulesContextType | undefined>(undefined);

const storageKey = (tenantId: string) => `tela_modules_${tenantId}`;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ModulesProvider({ children }: { children: ReactNode }) {
  const { tenant, loading: authLoading, isDemo } = useAuth();
  const [activeModules, setActiveModules] = useState<ModuleKey[]>(ALL_MODULES);
  const [industry, setIndustryState] = useState<string>('general');
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Resolve subscription tier — demo gets premium, unknown maps to starter
  const tier: SubscriptionTier = useMemo(() => {
    if (isDemo) return 'premium';
    const t = tenant?.subscription_tier as SubscriptionTier | undefined;
    if (t === 'premium' || t === 'enterprise') return t;
    // Legacy 'pro' maps to premium
    if ((t as any) === 'pro') return 'premium';
    return 'starter';
  }, [tenant?.subscription_tier, isDemo]);

  const tierAllowedModules = useMemo(() => new Set(TIER_MODULES[tier]), [tier]);

  const tierAllows = (key: ModuleKey) => tierAllowedModules.has(key);
  const maxUsers = TIER_MAX_USERS[tier];

  useEffect(() => {
    if (authLoading) return;
    const key = storageKey(tenant?.id ?? 'demo');
    const saved = localStorage.getItem(key);

    // Check if this is a newly created company that needs onboarding
    const isNewCompany = localStorage.getItem('tela_new_company') === 'true';

    if (isNewCompany && tenant?.id) {
      // Clear the flag and show onboarding for the new company
      localStorage.removeItem('tela_new_company');
      setOnboardingCompleted(false);
      setActiveModules(ALL_MODULES);
      setIndustryState('general');
      setLoading(false);
      return;
    }

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
      // For returning users switching to existing companies, skip onboarding
      const isCompanySwitch = !!localStorage.getItem('tela_active_tenant');
      const shouldSkip = isDemo || isCompanySwitch || !!tenant?.id;
      if (shouldSkip) {
        setActiveModules(ALL_MODULES);
        setIndustryState('general');
        setOnboardingCompleted(true);
        const k = storageKey(tenant?.id ?? 'demo');
        localStorage.setItem(k, JSON.stringify({ activeModules: ALL_MODULES, industry: 'general', onboardingCompleted: true }));
      } else {
        setOnboardingCompleted(false);
      }
    }
    setLoading(false);
  }, [authLoading, tenant?.id, isDemo]);

  const save = (modules: ModuleKey[], ind: string, completed: boolean) => {
    const key = storageKey(tenant?.id ?? 'demo');
    localStorage.setItem(key, JSON.stringify({ activeModules: modules, industry: ind, onboardingCompleted: completed }));
  };

  // A module is "active" only if tier allows it AND user has selected it
  const isModuleActive = (key: ModuleKey) =>
    tierAllowedModules.has(key) && activeModules.includes(key);

  const toggleModule = (key: ModuleKey) => {
    // Can only toggle modules the tier allows
    if (!tierAllowedModules.has(key)) return;
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
      tier, tierAllows, isModuleActive, maxUsers,
      toggleModule, setIndustry, completeOnboarding,
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
