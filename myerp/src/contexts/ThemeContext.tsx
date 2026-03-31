import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem('dark_mode') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) { root.classList.add('dark'); }
    else { root.classList.remove('dark'); }
    try { localStorage.setItem('dark_mode', String(darkMode)); } catch {}
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(v => !v);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
