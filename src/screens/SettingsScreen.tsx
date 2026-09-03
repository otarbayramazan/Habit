import { useAuth } from '@/context/AuthContext';
import { useSettings, type Language } from '@/context/SettingsContext';
import { useT } from '@/lib/i18n';
import { LogOut, Globe, User, Check } from 'lucide-react';

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useSettings();
  const t = useT(language);

  return (
    <div className="px-4 pt-6 pb-32 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">{t('settings')}</h1>

      {/* Account section */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 px-1">
          {t('account')}
        </h2>
        <div className="rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] divide-y divide-[#1a1a1a] overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
              <User className="w-5 h-5 text-neutral-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-neutral-500 text-xs">{t('email')}</p>
              <p className="text-white text-sm font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 p-4 text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-red-950/30 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">{t('signOut')}</span>
          </button>
        </div>
      </div>

      {/* Language section */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 px-1">
          {t('language')}
        </h2>
        <div className="rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] divide-y divide-[#1a1a1a] overflow-hidden">
          <OptionRow
            icon={<Globe className="w-5 h-5" />}
            label={t('english')}
            active={language === 'en'}
            onClick={() => setLanguage('en' as Language)}
          />
          <OptionRow
            icon={<Globe className="w-5 h-5" />}
            label={t('russian')}
            active={language === 'ru'}
            onClick={() => setLanguage('ru' as Language)}
          />
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 hover:bg-[#1a1a1a] transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-neutral-400">
        {icon}
      </div>
      <span className="flex-1 text-left text-white text-sm font-medium">{label}</span>
      {active && (
        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}
