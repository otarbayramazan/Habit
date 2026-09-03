import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/screens/AuthScreen';
import { MainViews } from '@/screens/MainViews';
import { StatisticsScreen } from '@/screens/StatisticsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { BottomNav, type Tab } from '@/components/BottomNav';

export function AppShell() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('week');

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className={tab === 'week' ? '' : 'hidden'}>
        <MainViews view="week" />
      </div>
      <div className={tab === 'month' ? '' : 'hidden'}>
        <MainViews view="month" />
      </div>
      <div className={tab === 'year' ? '' : 'hidden'}>
        <MainViews view="year" />
      </div>
      <div className={tab === 'statistics' ? '' : 'hidden'}>
        <StatisticsScreen />
      </div>
      <div className={tab === 'settings' ? '' : 'hidden'}>
        <SettingsScreen />
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
