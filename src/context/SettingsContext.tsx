import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'en' | 'ru';

type SettingsContextType = {
  language: Language;
  setLanguage: (l: Language) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('ht-lang');
    return stored === 'ru' ? 'ru' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('ht-lang', language);
  }, [language]);

  const setLanguage = (l: Language) => setLanguageState(l);

  return (
    <SettingsContext.Provider value={{ language, setLanguage }}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
