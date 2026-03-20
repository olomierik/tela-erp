import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ThemeContextType {
  applyTenantTheme: (primaryColor?: string, accentColor?: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function applyColor(property: string, hex: string) {
  const hsl = hexToHSL(hex);
  if (hsl) {
    document.documentElement.style.setProperty(property, `${hsl.h} ${hsl.s}% ${hsl.l}%`);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { tenant } = useAuth();

  const applyTenantTheme = (primaryColor?: string, accentColor?: string) => {
    if (primaryColor) {
      applyColor('--primary', primaryColor);
      applyColor('--ring', primaryColor);
      applyColor('--sidebar-primary', primaryColor);
      applyColor('--sidebar-ring', primaryColor);
    }
    if (accentColor) {
      applyColor('--accent', accentColor);
    }
  };

  useEffect(() => {
    if (tenant) {
      applyTenantTheme(
        tenant.primary_color || undefined,
        tenant.secondary_color || undefined
      );
    }
  }, [tenant?.primary_color, tenant?.secondary_color]);

  return (
    <ThemeContext.Provider value={{ applyTenantTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
