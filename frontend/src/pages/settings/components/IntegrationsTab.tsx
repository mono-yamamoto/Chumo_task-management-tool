import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { HardDrive, Github, MessageCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useUpdateUser } from '../../../hooks/useUpdateUser';
import { apiClient } from '../../../lib/api';

interface IntegrationCardProps {
  icon: React.ReactNode;
  iconBg: string;
  name: string;
  description: string;
  connected?: boolean;
  onConnect?: () => void;
  inputField?: {
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
    isSaving?: boolean;
  };
}

function IntegrationCard({
  icon,
  iconBg,
  name,
  description,
  connected,
  onConnect,
  inputField,
}: IntegrationCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-default bg-bg-primary p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconBg}`}
          >
            {icon}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text-primary">{name}</span>
            <span className="text-xs text-text-secondary">{description}</span>
          </div>
        </div>
        {onConnect &&
          !inputField &&
          (connected ? (
            <div className="flex items-center gap-2">
              <span className="flex h-9 items-center rounded-md border border-green-200 bg-green-50 px-4 text-xs font-medium text-green-700">
                {'✓ 連携済み'}
              </span>
              <Button variant="outline" size="md" className="text-xs" onPress={onConnect}>
                再連携
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="md" className="text-xs gap-1.5" onPress={onConnect}>
              連携する
            </Button>
          ))}
      </div>
      {inputField && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputField.value}
            onChange={(e) => inputField.onChange(e.target.value)}
            aria-label={`${name} の設定値`}
            className="h-10 flex-1 rounded-md border border-border-default bg-transparent px-3 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
          />
          <Button
            variant="outline"
            size="lg"
            className="text-sm px-4"
            onPress={inputField.onSave}
            isDisabled={inputField.isSaving}
          >
            {inputField.isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      )}
    </div>
  );
}

export function IntegrationsTab() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const updateUser = useUpdateUser();
  const { getToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [githubUsername, setGithubUsername] = useState('');
  const [chatUserId, setChatUserId] = useState('');
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [driveMessage, setDriveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setGithubUsername(currentUser.githubUsername ?? '');
      setChatUserId(currentUser.chatId ?? '');
    }
  }, [currentUser]);

  // OAuth コールバック結果の検知
  useEffect(() => {
    const driveStatus = searchParams.get('drive');
    if (driveStatus === 'connected') {
      setDriveMessage({ type: 'success', text: 'Google Driveとの連携が完了しました' });
      searchParams.delete('drive');
      setSearchParams(searchParams, { replace: true });
    } else if (driveStatus === 'error') {
      const msg = searchParams.get('message') || '連携に失敗しました';
      setDriveMessage({ type: 'error', text: msg });
      searchParams.delete('drive');
      searchParams.delete('message');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const driveConnected = currentUser?.googleOAuthUpdatedAt != null;

  const handleDriveConnect = async () => {
    setDriveConnecting(true);
    try {
      const data = await apiClient<{ url: string }>('/api/drive/auth-url', {
        getToken,
      });
      window.location.href = data.url;
    } catch {
      setDriveMessage({ type: 'error', text: 'OAuth URL の取得に失敗しました' });
      setDriveConnecting(false);
    }
  };

  const handleSaveGithub = () => {
    if (!currentUser) return;
    updateUser.mutate({ userId: currentUser.id, data: { githubUsername } });
  };

  const handleSaveChat = () => {
    if (!currentUser) return;
    updateUser.mutate({ userId: currentUser.id, data: { chatId: chatUserId || null } });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8 px-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-text-primary">連携サービス</h2>
        <p className="text-sm text-text-secondary">外部サービスとの連携を管理します</p>
      </div>

      {driveMessage && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            driveMessage.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {driveMessage.text}
        </div>
      )}

      <IntegrationCard
        icon={<HardDrive size={20} className="text-blue-600" />}
        iconBg="bg-blue-50"
        name="Google Drive"
        description={
          driveConnected
            ? 'レポートの自動エクスポート先（連携済み）'
            : 'レポートの自動エクスポート先'
        }
        connected={driveConnected}
        onConnect={driveConnecting ? undefined : handleDriveConnect}
      />

      <IntegrationCard
        icon={<Github size={20} className="text-neutral-800 dark:text-neutral-200" />}
        iconBg="bg-bg-tertiary"
        name="GitHub"
        description="Issue連携に使用するユーザー名"
        inputField={{
          value: githubUsername,
          onChange: setGithubUsername,
          onSave: handleSaveGithub,
          isSaving: updateUser.isPending,
        }}
      />

      <IntegrationCard
        icon={<MessageCircle size={20} className="text-green-600" />}
        iconBg="bg-green-50"
        name="Google Chat"
        description="通知の送信先ユーザーID"
        inputField={{
          value: chatUserId,
          onChange: setChatUserId,
          onSave: handleSaveChat,
          isSaving: updateUser.isPending,
        }}
      />
    </div>
  );
}
