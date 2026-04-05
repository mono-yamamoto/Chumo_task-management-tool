import { useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useUpdateUser } from '../../../hooks/useUpdateUser';
import { useAuth } from '../../../hooks/useAuth';

const ICON_COLORS = [
  { name: 'teal', bg: 'bg-teal-500', text: 'text-white', border: 'border-teal-600' },
  { name: 'blue', bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
  { name: 'green', bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' },
  { name: 'amber', bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600' },
  { name: 'red', bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' },
  { name: 'neutral', bg: 'bg-neutral-500', text: 'text-white', border: 'border-neutral-600' },
] as const;

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ProfileTab() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const updateUser = useUpdateUser();
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [selectedColor, setSelectedColor] = useState('teal');
  const [uploading, setUploading] = useState(false);

  // API データで初期化
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName ?? '');
      if (currentUser.avatarColor) {
        setSelectedColor(currentUser.avatarColor);
      }
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
    updateUser.mutate({
      userId: currentUser.id,
      data: { displayName, avatarColor: selectedColor },
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('JPG, PNG, GIF, WebP のみアップロード可能です');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('ファイルサイズは2MB以下にしてください');
      return;
    }

    setUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', `avatars/${currentUser.id}`);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error('アップロードに失敗しました');
      const { url } = (await res.json()) as { url: string };

      updateUser.mutate({
        userId: currentUser.id,
        data: { avatarUrl: url },
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarDelete = () => {
    if (!currentUser) return;
    updateUser.mutate({
      userId: currentUser.id,
      data: { avatarUrl: null },
    });
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
        {currentUser?.avatarUrl ? (
          <img
            src={currentUser.avatarUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        ) : (
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
        )}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text-primary">アイコン画像</span>
          <span className="text-xs text-text-tertiary">JPG, PNG, GIF（最大 2MB）</span>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarUpload}
              className="sr-only"
            />
            <Button
              variant="primary"
              size="sm"
              onPress={() => fileInputRef.current?.click()}
              isDisabled={uploading}
            >
              <Upload size={14} />
              {uploading ? 'アップロード中...' : 'アップロード'}
            </Button>
            {currentUser?.avatarUrl && (
              <Button variant="destructive" size="sm" onPress={handleAvatarDelete}>
                画像を削除
              </Button>
            )}
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
