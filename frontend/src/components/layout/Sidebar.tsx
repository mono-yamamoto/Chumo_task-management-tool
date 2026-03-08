import {
  LayoutDashboard,
  ListTodo,
  BarChart3,
  MessageSquare,
  Settings,
  SquareCheckBig,
  StickyNote,
  Palette,
} from 'lucide-react';
import { SidebarNavItem } from './SidebarNavItem';
import { useTheme } from '../../hooks/useTheme';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'ダッシュボード', icon: <LayoutDashboard size={20} /> },
  { path: '/tasks', label: 'タスク', icon: <ListTodo size={20} /> },
  { path: '/report', label: 'レポート', icon: <BarChart3 size={20} /> },
  { path: '/contact', label: 'お問い合わせ', icon: <MessageSquare size={20} /> },
  { path: '/settings', label: '設定', icon: <Settings size={20} /> },
];

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-teal-950 border-r border-teal-800 px-4 py-6">
      {/* ロゴ */}
      <div className="flex h-10 items-center gap-2.5 px-2">
        <SquareCheckBig size={24} className="text-teal-300" />
        <span className="text-xl font-bold text-white">ちゅも</span>
      </div>

      {/* スペーサー */}
      <div className="h-8" />

      {/* MENU ラベル */}
      <p className="px-3 text-xs font-medium tracking-widest text-teal-400 mb-3">MENU</p>

      {/* メインナビゲーション */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.path} to={item.path} icon={item.icon} label={item.label} />
        ))}
      </nav>

      {/* 下部エリア */}
      <div className="space-y-1">
        {/* メモ */}
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-base text-teal-300 transition-colors hover:bg-teal-800/50 hover:text-teal-200 [&_svg]:text-teal-400"
        >
          <StickyNote size={20} />
          <span>メモ</span>
        </button>

        {/* テーマトグル */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-teal-300 transition-colors hover:bg-teal-800/50 hover:text-teal-200 [&_svg]:text-teal-400 h-9"
        >
          <Palette size={20} />
          <span>{theme === 'light' ? 'ライトモード' : 'ダークモード'}</span>
        </button>

        {/* ユーザープロフィール */}
        <div className="flex items-center gap-3 border-t border-teal-700 px-2 pt-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-default">
            <span className="text-sm font-bold text-white">T</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">Tanaka Yui</p>
            <p className="truncate text-xs text-teal-400">Project Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
