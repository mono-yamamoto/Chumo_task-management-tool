import { User, Puzzle, Bell, Shield } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { SettingsTab } from '../SettingsPage';

const TABS = [
  { id: 'profile' as const, label: 'プロフィール', icon: User },
  { id: 'integrations' as const, label: '連携', icon: Puzzle },
  { id: 'notifications' as const, label: '通知', icon: Bell },
  { id: 'admin' as const, label: 'メンバー管理', icon: Shield },
];

interface SettingsNavProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export function SettingsNav({ activeTab, onTabChange }: SettingsNavProps) {
  return (
    <nav className="flex w-[200px] shrink-0 flex-col gap-1 border-r border-border-default py-6 px-4">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={cn(
            'flex h-10 items-center gap-2.5 rounded-md px-3 text-sm transition-colors',
            activeTab === id
              ? 'bg-bg-tertiary font-medium text-text-primary'
              : 'text-text-secondary hover:bg-bg-tertiary/50'
          )}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </nav>
  );
}
