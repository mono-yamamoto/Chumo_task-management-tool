import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useUpdateUser } from '../../../hooks/useUpdateUser';

const ICON_COLORS = [
  { name: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-600' },
  { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-600' },
  { name: 'green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-600' },
  { name: 'amber', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-600' },
  { name: 'red', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-600' },
  { name: 'neutral', bg: 'bg-neutral-200', text: 'text-neutral-700', border: 'border-neutral-600' },
] as const;

export function ProfileTab() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const updateUser = useUpdateUser();

  const [displayName, setDisplayName] = useState('');
  const [selectedColor, setSelectedColor] = useState('teal');

  // API データで初期化
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName ?? '');
    }
  }, [currentUser]);

  const selectedColorConfig = ICON_COLORS.find((c) => c.name === selectedColor) ?? ICON_COLORS[0];
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSave = () => {
    if (!currentUser) return;
    // TODO: displayName はバックエンド updateUser API で未サポート（githubUsername/chatId/isAllowed のみ）
    // バックエンド拡張後にここで displayName を送信する
    updateUser.mutate({ userId: currentUser.id, data: {} });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 py-8 px-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-text-primary">プロフィール</h2>
        <p className="text-sm text-text-secondary">あなたのプロフィール情報を管理します</p>
      </div>

      {/* Avatar Section */}
      <div className="flex items-center gap-6">
        <div
          className={cn(
            'flex h-20 w-20 shrink-0 items-center justify-center rounded-full',
            selectedColorConfig.bg
          )}
        >
          <span className={cn('text-2xl font-medium', selectedColorConfig.text)}>
            {initials || '?'}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text-primary">アイコン画像</span>
          <span className="text-xs text-text-tertiary">JPG, PNG, GIF（最大 2MB）</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-md border border-border-default px-3 text-xs font-medium text-text-primary transition-colors hover:bg-bg-secondary"
            >
              <Upload size={14} className="text-text-secondary" />
              アップロード
            </button>
            <button
              type="button"
              className="flex h-8 items-center rounded-md px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
            >
              削除
            </button>
          </div>
        </div>
      </div>

      <hr className="border-border-default" />

      {/* Icon Color */}
      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-text-primary">アイコンカラー</span>
        <span className="text-xs text-text-tertiary">
          アイコン画像が未設定の場合に表示される背景色
        </span>
        <div className="flex items-center gap-2.5">
          {ICON_COLORS.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => setSelectedColor(color.name)}
              className={cn(
                'h-8 w-8 rounded-full transition-shadow',
                color.bg,
                selectedColor === color.name && `border-2 ${color.border}`
              )}
              aria-label={color.name}
            />
          ))}
        </div>
      </div>

      <hr className="border-border-default" />

      {/* Display Name */}
      <div className="flex flex-col gap-2">
        <label htmlFor="displayName" className="text-sm font-medium text-text-primary">
          表示名
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="h-10 w-[360px] rounded-md border border-border-default bg-transparent px-3 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
        />
      </div>

      {/* Save */}
      <div>
        <Button
          variant="primary"
          size="lg"
          className="px-6 text-sm"
          onPress={handleSave}
          isDisabled={updateUser.isPending}
        >
          {updateUser.isPending ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
}
