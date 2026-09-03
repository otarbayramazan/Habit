import { useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { AppShell } from '@/components/AppShell';

function useRemoveBoltBadge() {
  useEffect(() => {
    const removeBadge = () => {
      const selectors = [
        '[class*="bolt-badge"]',
        '[class*="bolt"]',
        'a[href*="bolt.new"]',
        'iframe[src*="bolt"]',
        '[data-bolt-badge]',
      ];
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach((el) => el.remove());
      }
    };

    removeBadge();

    const observer = new MutationObserver(() => removeBadge());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);
}

function App() {
  useRemoveBoltBadge();

  return (
    <SettingsProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
