import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  BarChart3,
  MessageSquare,
  Settings,
  SquareCheckBig,
  // StickyNote,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { Button as AriaButton, DialogTrigger, Popover, Dialog } from 'react-aria-components';
import { SidebarNavItem } from './SidebarNavItem';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'ダッシュボード', icon: <LayoutDashboard size={20} /> },
  { path: '/tasks', label: 'タスク', icon: <ListTodo size={20} /> },
  { path: '/report', label: 'レポート', icon: <BarChart3 size={20} /> },
  { path: '/contact', label: 'お問い合わせ', icon: <MessageSquare size={20} /> },
];

const ROLE_LABELS: Record<string, string> = {
  admin: '管理者',
  member: 'メンバー',
};

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { user: clerkUser, logout } = useAuth();
  const { data: currentUser } = useCurrentUser();

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
        {/* メモ（未実装のため非表示）
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-base text-teal-300 transition-colors hover:bg-teal-800/50 hover:text-teal-200 [&_svg]:text-teal-400 cursor-pointer"
        >
          <StickyNote size={20} />
          <span>メモ</span>
        </button>
        */}

        {/* テーマトグル */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-teal-300 transition-colors hover:bg-teal-800/50 hover:text-teal-200 h-9 cursor-pointer"
        >
          <div className="relative flex h-6 w-11 items-center rounded-full bg-teal-800 p-0.5 transition-colors">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full bg-teal-300 shadow-sm transition-transform ${
                theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {theme === 'light' ? (
                <Sun size={12} className="text-teal-900" />
              ) : (
                <Moon size={12} className="text-teal-900" />
              )}
            </div>
          </div>
          <span>{theme === 'light' ? 'ライトモード' : 'ダークモード'}</span>
        </button>

        {/* ユーザープロフィール + ポップアップメニュー */}
        <DialogTrigger>
          <AriaButton className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-teal-800/50 cursor-pointer">
            <Avatar
              name={currentUser?.displayName ?? clerkUser?.fullName ?? '?'}
              imageUrl={currentUser?.avatarUrl ?? undefined}
              colorName={currentUser?.avatarColor}
              size="md"
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-white">
                {currentUser?.displayName ?? clerkUser?.fullName ?? ''}
              </p>
              <p className="truncate text-xs text-teal-400">
                {currentUser?.role ? (ROLE_LABELS[currentUser.role] ?? currentUser.role) : ''}
              </p>
            </div>
          </AriaButton>
          <Popover
            placement="top start"
            offset={8}
            className="w-[var(--trigger-width)] rounded-lg border border-teal-800 bg-teal-950 shadow-lg outline-none"
          >
            <Dialog className="outline-none">
              {({ close }) => (
                <div className="py-1">
                  <NavLink
                    to="/settings"
                    onClick={close}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-teal-300 transition-colors hover:bg-teal-800/50 hover:text-teal-200"
                  >
                    <Settings size={16} />
                    <span>設定</span>
                  </NavLink>
                  <div className="my-1 border-t border-teal-800" />
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      logout();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-teal-800/50 hover:text-red-300 cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span>ログアウト</span>
                  </button>
                </div>
              )}
            </Dialog>
          </Popover>
        </DialogTrigger>
      </div>
    </aside>
  );
}
