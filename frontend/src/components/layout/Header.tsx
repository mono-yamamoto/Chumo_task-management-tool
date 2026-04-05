import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '../ui/Input';
import { TimerWidget } from '../shared/TimerWidget';
import { NotificationPopover } from './NotificationPopover';

interface HeaderProps {
  title: string;
  children?: ReactNode;
}

/** 検索 + 通知ベルのデフォルトアクション */
function DefaultHeaderActions() {
  const [searchValue, setSearchValue] = useState('');
  const navigate = useNavigate();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      navigate(`/tasks?title=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  return (
    <>
      <TimerWidget />
      <div onKeyDown={handleKeyDown}>
        <Input
          placeholder="タスクを検索..."
          icon={<Search size={16} />}
          className="w-[220px]"
          value={searchValue}
          onChange={setSearchValue}
        />
      </div>
      <NotificationPopover />
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
