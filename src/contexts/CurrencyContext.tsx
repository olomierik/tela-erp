import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', KES: 'KSh', TZS: 'TSh',
  UGX: 'USh', ZAR: 'R', NGN: '₦', GHS: '₵', INR: '₹', CNY: '¥',
  BRL: 'R$', CAD: 'C$', AUD: 'A$', CHF: 'CHF', SEK: 'kr', NOK: 'kr',
  DKK: 'kr', MXN: 'MX$', AED: 'AED', SAR: 'SAR', EGP: 'E£', RWF: 'RF',
};

const POPULAR_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'KES', 'TZS', 'UGX', 'ZAR', 'NGN', 'GHS',
  'INR', 'CNY', 'JPY', 'BRL', 'CAD', 'AUD', 'CHF', 'AED', 'SAR',
  'EGP', 'RWF', 'MXN', 'SEK', 'NOK', 'DKK',
];

interface CurrencyContextType {
  defaultCurrency: string;
  displayCurrency: string;
  setDisplayCurrency: (c: string) => void;
  saveDefaultCurrency: (code: string) => Promise<void>;
  formatMoney: (amount: number) => string;
  convertAmount: (amount: number) => number;
  rates: Record<string, number>;
  popularCurrencies: string[];
  currencySymbol: (code: string) => string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { tenant, isDemo } = useAuth();
  const [rates, setRates] = useState<Record<string, number>>({});
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [defaultCurrency, setDefaultCurrencyState] = useState('USD');
  const [loading, setLoading] = useState(true);

  // Sync defaultCurrency from tenant (on login / tenant load)
  useEffect(() => {
    const tenantCurrency = (tenant as any)?.default_currency || 'USD';
    setDefaultCurrencyState(tenantCurrency);
    // Only update displayCurrency from tenant if no localStorage override
    const saved = localStorage.getItem('tela_display_currency');
    if (!saved) setDisplayCurrency(tenantCurrency);
  }, [(tenant as any)?.default_currency]);

  // Load rates from DB
  useEffect(() => {
    async function loadRates() {
      const { data } = await supabase
        .from('exchange_rates' as any)
        .select('target_currency, rate')
        .eq('base_currency', 'USD');
      if (data) {
        const map: Record<string, number> = {};
        (data as any[]).forEach((r) => { map[r.target_currency] = Number(r.rate); });
        setRates(map);
      }
      setLoading(false);
    }
    loadRates();
  }, []);

  // Init displayCurrency from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('tela_display_currency');
    if (saved) setDisplayCurrency(saved);
  }, []);

  const handleSetDisplay = useCallback((c: string) => {
    setDisplayCurrency(c);
    localStorage.setItem('tela_display_currency', c);
  }, []);

  // Save new default currency to Supabase and sync all state immediately
  const saveDefaultCurrency = useCallback(async (code: string) => {
    if (!isDemo && tenant?.id) {
      const { error } = await (supabase.from('tenants') as any)
        .update({ default_currency: code })
        .eq('id', tenant.id);
      if (error) throw error;
    }
    setDefaultCurrencyState(code);
    setDisplayCurrency(code);
    localStorage.setItem('tela_display_currency', code);
  }, [tenant?.id, isDemo]);

  const convertAmount = useCallback((amountInDefault: number): number => {
    if (displayCurrency === defaultCurrency) return amountInDefault;
    // Convert: default → USD → display
    const toUsd = rates[defaultCurrency] ? amountInDefault / rates[defaultCurrency] : amountInDefault;
    const toDisplay = rates[displayCurrency] ? toUsd * rates[displayCurrency] : toUsd;
    return toDisplay;
  }, [displayCurrency, defaultCurrency, rates]);

  const currencySymbol = useCallback((code: string) => CURRENCY_SYMBOLS[code] || code + ' ', []);

  const formatMoney = useCallback((amount: number): string => {
    const converted = convertAmount(amount);
    const sym = currencySymbol(displayCurrency);
    return `${sym}${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }, [convertAmount, displayCurrency, currencySymbol]);

  return (
    <CurrencyContext.Provider value={{
      defaultCurrency,
      displayCurrency,
      setDisplayCurrency: handleSetDisplay,
      saveDefaultCurrency,
      formatMoney,
      convertAmount,
      rates,
      popularCurrencies: POPULAR_CURRENCIES,
      currencySymbol,
      loading,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
