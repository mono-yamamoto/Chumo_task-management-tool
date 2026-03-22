import type { ReactNode } from 'react';
import { Search, Bell } from 'lucide-react';
import { Input } from '../ui/Input';
import { IconButton } from '../ui/IconButton';
import { TimerWidget } from '../shared/TimerWidget';

interface HeaderProps {
  title: string;
  children?: ReactNode;
}

/** 検索 + 通知ベルのデフォルトアクション */
function DefaultHeaderActions() {
  return (
    <>
      <TimerWidget />
      <Input placeholder="タスクを検索..." icon={<Search size={16} />} className="w-[220px]" />
      <div className="relative">
        <IconButton aria-label="通知" className="h-9 w-9 rounded-md border border-border-default">
          <Bell size={18} />
        </IconButton>
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
      </div>
    </>
  );
}

export function Header({ title, children }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border-default bg-bg-primary px-8">
      <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      <div className="flex items-center gap-3">{children ?? <DefaultHeaderActions />}</div>
    </header>
  );
}
