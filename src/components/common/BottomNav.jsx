import React from 'react';
import { Home, Users, Settings } from 'lucide-react';
import { t } from '../../lib/i18n';

export default function BottomNav({ activeTab, setActiveTab, lang }) {
  const tabs = [
    { id: 'home', icon: Home, labelKey: 'home' },
    { id: 'customers', icon: Users, labelKey: 'customers' },
    { id: 'settings', icon: Settings, labelKey: 'settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-ambient-up"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)' }}>
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map(({ id, icon: Icon, labelKey }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex flex-col items-center justify-center w-20 h-full gap-1 transition-all duration-200 active:scale-90 ${
                active ? 'text-primary-container' : 'text-on-surface-variant'
              }`}
            >
              {/* Active pill indicator */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary-container rounded-b-full" />
              )}
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                fill={active ? 'currentColor' : 'none'}
              />
              <span className={`text-[10px] font-semibold leading-none ${active ? 'opacity-100' : 'opacity-70'}`}>
                {t(lang, labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
